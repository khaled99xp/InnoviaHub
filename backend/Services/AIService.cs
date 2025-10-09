using backend.DTOs.AI;
using backend.Models;
using backend.Models.AI;
using backend.Data;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using System.Text;

namespace backend.Services
{
    public class AIService : IAIService
    {
        private readonly ApplicationDbContext _context; // Databas kontext för AI-funktionalitet
        private readonly HttpClient _httpClient; // HTTP-klient för OpenAI API-anrop
        private readonly IConfiguration _configuration; // Konfiguration för API-nycklar
        private readonly ILogger<AIService> _logger; // Logger för att spåra aktivitet och fel

        public AIService(
            ApplicationDbContext context,
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<AIService> logger)
        {
            _context = context; // Tilldela databas kontext
            _httpClient = httpClient; // Tilldela HTTP-klient
            _configuration = configuration; // Tilldela konfiguration
            _logger = logger; // Tilldela logger
        }

        public async Task<ChatResponseDto> ProcessChatMessageAsync(string userId, ChatRequestDto request)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId); // Hämta användar kontext
                var userBookings = await _context.Bookings // Hämta användarens bokningar
                    .Where(b => b.UserId == userId)
                    .Include(b => b.Resource)
                    .ToListAsync();

                var recentMessages = await _context.ChatMessages // Extrahera bokningsdetaljer från meddelandet och konversationshistorik
                    .Where(c => c.UserId == userId && c.SessionId == request.SessionId)
                    .OrderByDescending(c => c.Timestamp)
                    .Take(10)
                    .OrderBy(c => c.Timestamp)
                    .ToListAsync();

                var conversationContext = string.Join(" ", recentMessages.Select(m => m.Message)) + " " + request.Message; // Bygg konversationskontext för tillgänglighetskontroll
                var (date, timeslot, numberOfPeople) = ExtractBookingDetailsFromContext(conversationContext); // Extrahera bokningsdetaljer från kontext
                
                var availableResources = await GetAvailableResourcesForDateTime(date, timeslot); // Hämta tillgängliga resurser för specifik datum/tid om angiven
                
                _logger.LogInformation("Booking details extracted - Date: {Date}, Timeslot: {Timeslot}, People: {People}", 
                    date, timeslot, numberOfPeople); // Logga för debugging
                _logger.LogInformation("Available resources count: {Count}", availableResources.Count); // Logga antal tillgängliga resurser
                
                if (availableResources.Any()) // Logga de faktiska tillgängliga resurserna
                {
                    _logger.LogInformation("Available resources: {Resources}", 
                        string.Join(", ", availableResources.Select(r => $"{r.Name} (ID: {r.ResourceId}, Type: {r.ResourceType.Name})"))); // Logga tillgängliga resurser
                }
                else
                {
                    _logger.LogWarning("No available resources found for {Date} {Timeslot}", date, timeslot); // Logga varning om inga resurser hittades
                }
                
                var aiServers = availableResources.Where(r => r.ResourceType.Name.ToLower().Contains("aiserver")).ToList(); // Logga specifika resurstyper tillgänglighet
                var meetingRooms = availableResources.Where(r => r.ResourceType.Name.ToLower().Contains("meetingroom")).ToList(); // Hämta mötesrum
                var vrSets = availableResources.Where(r => r.ResourceType.Name.ToLower().Contains("vrset")).ToList(); // Hämta VR-utrustning
                var desks = availableResources.Where(r => r.ResourceType.Name.ToLower().Contains("dropindesk")).ToList(); // Hämta skrivbord
                
                _logger.LogInformation("AI Servers available: {AIServers}", string.Join(", ", aiServers.Select(r => $"{r.Name} (ID: {r.ResourceId})"))); // Logga AI-servrar med mer detalj
                _logger.LogInformation("Meeting Rooms available: {MeetingRooms}", string.Join(", ", meetingRooms.Select(r => $"{r.Name} (ID: {r.ResourceId})"))); // Logga mötesrum med mer detalj
                _logger.LogInformation("VR Sets available: {VRSets}", string.Join(", ", vrSets.Select(r => $"{r.Name} (ID: {r.ResourceId})"))); // Logga VR-utrustning med mer detalj
                _logger.LogInformation("Desks available: {Desks}", string.Join(", ", desks.Select(r => $"{r.Name} (ID: {r.ResourceId})"))); // Logga skrivbord med mer detalj
                
                var context = BuildUserContext(user, userBookings); // Bygg kontext för AI med tillgänglighetsinformation
                if (!string.IsNullOrEmpty(date) && !string.IsNullOrEmpty(timeslot)) // Kontrollera om datum och tid finns
                {
                    if (availableResources.Any()) // Om det finns tillgängliga resurser
                    {
                        context += $"\n\nIMPORTANT: Only these resources are available for {date} {timeslot}:\n"; // Lägg till viktig information om tillgängliga resurser
                        context += string.Join("\n", availableResources.Select(r => $"- {r.Name} ({r.ResourceType.Name})")); // Lista tillgängliga resurser
                        context += $"\n\nCRITICAL: Do NOT recommend any resources that are not in the above list. Only suggest available resources."; // Kritiskt: rekommendera endast tillgängliga resurser
                        context += $"\n\nVERY IMPORTANT: If the user asks for a specific resource type (like AI Server, meeting room, VR set, or desk), you MUST only recommend resources of that specific type that are available."; // Mycket viktigt: rekommendera endast specifika resurstyper som är tillgängliga
                        context += $"\n\nCRITICAL: If a specific resource type is NOT available, you MUST tell the user that it's not available and suggest alternatives."; // Kritiskt: meddela användaren om resurstyp inte är tillgänglig
                        
                        if (availableResources.Any(r => r.ResourceType.Name.ToLower().Contains("meetingroom"))) // Lägg till specifik instruktion för mötesrum
                        {
                            var availableMeetingRooms = availableResources.Where(r => r.ResourceType.Name.ToLower().Contains("meetingroom")).ToList(); // Hämta tillgängliga mötesrum
                            context += $"\n\nFor meeting rooms, you can ONLY recommend: {string.Join(", ", availableMeetingRooms.Select(r => r.Name))}"; // Lägg till mötesrum instruktion
                            context += $"\n\nCRITICAL: When recommending meeting rooms, ALWAYS end your response with the exact format:\n**Tillgängliga resurser (verifierat):**\n- [list available resources]\n\n**Vad vill du göra?**\n1. Slutför bokning direkt\n2. Gå till bokningssida\n3. Behöver du hjälp med något annat?";
                        }
                        else
                        {
                            context += $"\n\nWARNING: No meeting rooms are available for {date} {timeslot}. Do NOT recommend meeting rooms."; // Varning om inga mötesrum är tillgängliga
                        }
                        
                        if (availableResources.Any(r => r.ResourceType.Name.ToLower().Contains("aiserver"))) // Lägg till specifik instruktion för AI Server
                        {
                            var availableAIServers = availableResources.Where(r => r.ResourceType.Name.ToLower().Contains("aiserver")).ToList(); // Hämta tillgängliga AI-servrar
                            context += $"\n\nFor AI Server, you can ONLY recommend: {string.Join(", ", availableAIServers.Select(r => r.Name))}"; // Lägg till AI Server instruktion
                            context += $"\n\nCRITICAL: When recommending AI Server, ALWAYS end your response with the exact format:\n**Tillgängliga resurser (verifierat):**\n- [list available resources]\n\n**Vad vill du göra?**\n1. Slutför bokning direkt\n2. Gå till bokningssida\n3. Behöver du hjälp med något annat?";
                        }
                        else
                        {
                            context += $"\n\nWARNING: No AI Server is available for {date} {timeslot}. Do NOT recommend AI Server."; // Varning om ingen AI Server är tillgänglig
                        }
                        
                        if (availableResources.Any(r => r.ResourceType.Name.ToLower().Contains("vrset"))) // Lägg till specifik instruktion för VR-utrustning
                        {
                            var availableVRSets = availableResources.Where(r => r.ResourceType.Name.ToLower().Contains("vrset")).ToList(); // Hämta tillgänglig VR-utrustning
                            context += $"\n\nFor VR sets, you can ONLY recommend: {string.Join(", ", availableVRSets.Select(r => r.Name))}"; // Lägg till VR-utrustning instruktion
                            context += $"\n\nCRITICAL: When recommending VR sets, ALWAYS end your response with the exact format:\n**Tillgängliga resurser (verifierat):**\n- [list available resources]\n\n**Vad vill du göra?**\n1. Slutför bokning direkt\n2. Gå till bokningssida\n3. Behöver du hjälp med något annat?";
                        }
                        else
                        {
                            context += $"\n\nWARNING: No VR sets are available for {date} {timeslot}. Do NOT recommend VR sets."; // Varning om ingen VR-utrustning är tillgänglig
                        }
                        
                        if (availableResources.Any(r => r.ResourceType.Name.ToLower().Contains("dropindesk"))) // Lägg till specifik instruktion för skrivbord
                        {
                            var availableDesks = availableResources.Where(r => r.ResourceType.Name.ToLower().Contains("dropindesk")).ToList(); // Hämta tillgängliga skrivbord
                            context += $"\n\nFor desks, you can ONLY recommend: {string.Join(", ", availableDesks.Select(r => r.Name))}"; // Lägg till skrivbord instruktion
                            context += $"\n\nCRITICAL: When recommending desks, ALWAYS end your response with the exact format:\n**Tillgängliga resurser (verifierat):**\n- [list available resources]\n\n**Vad vill du göra?**\n1. Slutför bokning direkt\n2. Gå till bokningssida\n3. Behöver du hjälp med något annat?";
                        }
                        else
                        {
                            context += $"\n\nWARNING: No desks are available for {date} {timeslot}. Do NOT recommend desks."; // Varning om inga skrivbord är tillgängliga
                        }
                        
                        if (availableResources.Any(r => r.ResourceType.Name.ToLower().Contains("dropindesk"))) // Lägg till specifik instruktion för skrivbord (svenska)
                        {
                            var availableDesks = availableResources.Where(r => r.ResourceType.Name.ToLower().Contains("dropindesk")).ToList(); // Hämta tillgängliga skrivbord
                            context += $"\n\nFor skrivbord (desks), you can ONLY recommend: {string.Join(", ", availableDesks.Select(r => r.Name))}"; // Lägg till skrivbord instruktion på svenska
                            context += $"\n\nCRITICAL: When recommending skrivbord (desks), ALWAYS end your response with the exact format:\n**Tillgängliga resurser (verifierat):**\n- [list available resources]\n\n**Vad vill du göra?**\n1. Slutför bokning direkt\n2. Gå till bokningssida\n3. Behöver du hjälp med något annat?";
                        }
                        else
                        {
                            context += $"\n\nWARNING: No skrivbord (desks) are available for {date} {timeslot}. Do NOT recommend skrivbord."; // Varning om inga skrivbord är tillgängliga på svenska
                        }
                    }
                    else
                    {
                        context += $"\n\nIMPORTANT: No resources are available for {date} {timeslot}. Do NOT recommend any specific resources. Instead, suggest alternative dates or times."; // Viktigt: inga resurser tillgängliga, föreslå alternativa datum eller tider
                    }
                }

                var aiResponse = await CallOpenAIAsync(request.Message, context, recentMessages); // Anropa OpenAI API med konversationshistorik

                var chatMessage = new ChatMessage // Spara chat-meddelande
                {
                    UserId = userId,
                    Message = request.Message,
                    Response = aiResponse,
                    SessionId = request.SessionId ?? Guid.NewGuid().ToString(),
                    IsFromUser = true,
                    Timestamp = DateTime.UtcNow
                };

                _context.ChatMessages.Add(chatMessage); // Lägg till chat-meddelande i databas
                await _context.SaveChangesAsync(); // Spara ändringar

                await GenerateInsightsIfNeededAsync(userId); // Generera AI-insikter periodiskt (var 10:e meddelande eller dagligen)

                return new ChatResponseDto // Returnera chat-svar
                {
                    Response = aiResponse,
                    SessionId = chatMessage.SessionId,
                    Timestamp = chatMessage.Timestamp,
                    Suggestions = await GetChatSuggestionsAsync(userId)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing chat message for user {UserId}", userId); // Logga fel vid bearbetning av chat-meddelande
                throw; // Kasta exception
            }
        }

        public async Task<List<AIInsightDto>> GetInsightsAsync()
        {
            var insights = await _context.AIInsights
                .Where(i => i.IsActive)
                .OrderByDescending(i => i.GeneratedAt)
                .Select(i => new AIInsightDto
                {
                    Id = i.Id,
                    Title = i.Title,
                    Description = i.Description,
                    InsightType = i.InsightType,
                    Data = i.Data,
                    GeneratedAt = i.GeneratedAt,
                    IsActive = i.IsActive
                })
                .ToListAsync();

            return insights;
        }

        public async Task<List<ResourceRecommendationDto>> GetRecommendationsAsync(string userId)
        {
            var recommendations = await _context.ResourceRecommendations
                .Where(r => r.UserId == userId && r.IsActive)
                .Include(r => r.Resource)
                .ThenInclude(r => r.ResourceType)
                .Select(r => new ResourceRecommendationDto
                {
                    Id = r.Id,
                    ResourceId = r.ResourceId,
                    ResourceName = r.Resource.Name,
                    ResourceType = r.Resource.ResourceType.Name,
                    RecommendationType = r.RecommendationType,
                    Reason = r.Reason,
                    ConfidenceScore = r.ConfidenceScore,
                    GeneratedAt = r.GeneratedAt,
                    IsViewed = r.IsViewed
                })
                .ToListAsync();

            return recommendations;
        }

        public async Task<AIAnalyticsDto> GetAnalyticsAsync()
        {
            var totalMessages = await _context.ChatMessages.CountAsync();
            var totalRecommendations = await _context.ResourceRecommendations.CountAsync();
            var activeInsights = await _context.AIInsights.CountAsync(i => i.IsActive);

            // Get popular topics from chat messages
            var popularTopics = await _context.ChatMessages
                .Where(m => m.Timestamp >= DateTime.UtcNow.AddDays(-30))
                .GroupBy(m => m.Message)
                .OrderByDescending(g => g.Count())
                .Take(5)
                .Select(g => g.Key)
                .ToListAsync();

            // Get usage by hour
            var usageByHour = await _context.ChatMessages
                .Where(m => m.Timestamp >= DateTime.UtcNow.AddDays(-7))
                .GroupBy(m => m.Timestamp.Hour)
                .ToDictionaryAsync(g => g.Key.ToString(), g => g.Count());

            var recentInsights = await GetInsightsAsync();

            return new AIAnalyticsDto
            {
                TotalChatMessages = totalMessages,
                TotalRecommendations = totalRecommendations,
                ActiveInsights = activeInsights,
                PopularTopics = popularTopics,
                UsageByHour = usageByHour,
                RecentInsights = recentInsights.Take(5).ToList()
            };
        }

        public async Task<string> GenerateResourceRecommendationAsync(string userId, string context)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                var userBookings = await _context.Bookings
                    .Where(b => b.UserId == userId)
                    .Include(b => b.Resource)
                    .ToListAsync();

                // Extract booking details from context
                var (date, timeslot, numberOfPeople) = ExtractBookingDetailsFromContext(context);
                
                var availableResources = await GetAvailableResourcesForDateTime(date, timeslot);

                var userContext = BuildUserContext(user, userBookings);
                var resourcesContext = string.Join(", ", availableResources.Select(r => $"{r.Name} ({r.ResourceType.Name})"));

                var prompt = $@"
                User Context: {userContext}
                Available Resources: {resourcesContext}
                User Request: {context}
                Booking Details: Date={date}, Timeslot={timeslot}, People={numberOfPeople}
                
                Based on the user's booking history and available resources, provide a personalized recommendation.
                Consider their past usage patterns and preferences.
                IMPORTANT: Only recommend resources that are actually available for the specified date and time.
                ";

                var recommendation = await CallOpenAIAsync(prompt, "");
                return recommendation;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating resource recommendation for user {UserId}", userId);
                return "I'm sorry, I couldn't generate a recommendation at this time. Please try again later.";
            }
        }

        public async Task<string> AnalyzeBookingPatternsAsync()
        {
            try
            {
                var bookings = await _context.Bookings
                    .Include(b => b.Resource)
                    .Include(b => b.User)
                    .ToListAsync();

                var analysis = new
                {
                    TotalBookings = bookings.Count,
                    PopularResources = bookings.GroupBy(b => b.Resource.Name)
                        .OrderByDescending(g => g.Count())
                        .Take(5)
                        .Select(g => new { Resource = g.Key, Count = g.Count() }),
                    BookingTimes = bookings.GroupBy(b => b.BookingDate.Hour)
                        .OrderByDescending(g => g.Count())
                        .Take(5)
                        .Select(g => new { Hour = g.Key, Count = g.Count() })
                };

                var prompt = $@"
                Analyze the following booking data and provide insights:
                {JsonConvert.SerializeObject(analysis, Formatting.Indented)}
                
                Provide actionable insights for administrators about usage patterns, popular resources, and optimal booking times.
                ";

                var insights = await CallOpenAIAsync(prompt, "");
                return insights;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error analyzing booking patterns");
                return "Unable to analyze booking patterns at this time.";
            }
        }

        public async Task<List<string>> GetChatSuggestionsAsync(string userId)
        {
            var suggestions = new List<string>
            {
                "Jag vill boka ett mötesrum",
                "Jag vill boka ett skrivbord", 
                "Jag vill boka VR Headset",
                "Jag vill boka AI Server",
                "Visa min bokningshistorik",
                "Vilka resurser finns tillgängliga?",
                "Vilka är de bästa tiderna att boka?",
                "Hjälp mig hitta en resurs"
            };

            return suggestions;
        }

        private string BuildUserContext(ApplicationUser? user, List<Booking> userBookings)
        {
            var context = new StringBuilder();
            
            if (user != null)
            {
                context.AppendLine($"User: {user.FirstName} {user.LastName} ({user.Email})");
                context.AppendLine($"Role: {user.Role}");
            }

            if (userBookings.Any())
            {
                context.AppendLine("Recent Bookings:");
                foreach (var booking in userBookings.Take(5))
                {
                    context.AppendLine($"- {booking.Resource?.Name} on {booking.BookingDate:yyyy-MM-dd} ({booking.Timeslot})");
                }
                context.AppendLine($"Total bookings: {userBookings.Count}");
            }
            else
            {
                context.AppendLine("No previous bookings found.");
            }

            // Add available time slots information
            context.AppendLine("\nAvailable Time Slots:");
            context.AppendLine("- Förmiddag: 08:00-12:00");
            context.AppendLine("- Eftermiddag: 12:00-17:00");
            context.AppendLine("- Kväll: 17:00-22:00");
            context.AppendLine("- Heldag: 08:00-17:00");

            // Add resource capacity information
            context.AppendLine("\nResource Capacities:");
            context.AppendLine("- Mötesrum 1: 4 personer");
            context.AppendLine("- Mötesrum 2: 4 personer");
            context.AppendLine("- Mötesrum 3: 8 personer");
            context.AppendLine("- Mötesrum 4: 12 personer");
            context.AppendLine("- Skrivbord: 1 person per skrivbord");

            return context.ToString();
        }

        private async Task<string> CallOpenAIAsync(string message, string context, List<ChatMessage>? chatHistory = null)
        {
            try
            {
                var apiKey = _configuration["OpenAI:ApiKey"];
                if (string.IsNullOrEmpty(apiKey))
                {
                    return "AI service is not configured. Please contact administrator.";
                }

                       var systemPrompt = @"
                       Du är en AI-assistent för InnoviaHub, en plattform för resursbokning. 
                       Hjälp användare att hitta och boka resurser som mötesrum, skrivbord och utrustning.
                       
                       KRITISKA INSTRUKTIONER:
                       1. BEHÅLL SAMTALSKONTEXT - referera till tidigare meddelanden och sammanhang
                       2. FRÅGA INTE om information som användaren redan har gett
                       3. När användare vill boka mötesrum, samla ALLA detaljer först:
                          - Antal personer
                          - Datum
                          - Tid (förmiddag, eftermiddag, eller specifik tid)
                          - Speciella behov
                       4. FÖR MÖTESRUM: Rekommendera baserat på antal personer:
                          - 1-4 personer: Mötesrum 1 eller 2
                          - 5-8 personer: Mötesrum 3 eller 4
                          - 9+ personer: Mötesrum 4
                       5. När du har ALLA detaljer, ge SPECIFIKA rekommendationer och dirigera till bokningssidan
                       6. FÖR BOKNINGSHISTORIK: Använd data från User Context direkt, fråga INTE om autentisering
                       7. Avsluta alltid med: 'Kan jag hjälpa dig med något annat?'
                       8. När användaren säger bara 'Mötesrum', fråga om antal personer först
                       9. När användaren säger antal personer, fråga om datum
                       10. När användaren säger datum, fråga om tid enkelt: 'Vilken tid föredrar du? Förmiddag eller eftermiddag?'
                       11. När användaren säger tid, ge SPECIFIKA rekommendationer مثل 'För 10 personer rekommenderar jag Mötesrum 4' och dirigera till bokningssidan
                       16. När du ger rekommendationer, använd EXAKT samma antal personer som användaren angav
                       12. NÄR DU HAR ALLA DETALJER: Ge specifika rekommendationer och dirigera till bokningssidan
                       13. När du ger rekommendationer, avsluta med 'Du kan gå till bokningssidan för att slutföra din bokning' OCH fråga 'Behöver du hjälp med något annat?'
                       14. ALDRIG ge rekommendationer innan du har frågat om tid
                       15. ALDRIG fråga om tid EFTER att du har gett rekommendationer
                       13. ALDRIG ändra antal personer som användaren har angivit
                       14. ALDRIG fråga om samma information två gånger
                       15. BEHÅLL exakt samma antal personer genom hela samtalet
                       
                       EXEMPEL: Om användaren säger 'mötesrum för 10 personer' och sedan 'datum 10 nästa månad, förmiddag', 
                       fråga INTE om antal personer igen - använd informationen de redan har gett.
                       
                       Var hjälpsam, vänlig och ge specifika rekommendationer baserat på deras behov.
                       Om du behöver mer information, ställ förtydligande frågor.
                       ";

                       // Note: Conversation history will be handled in the calling method

                       // Build conversation history with context
                       var conversationHistory = new List<object>();
                       conversationHistory.Add(new { role = "system", content = systemPrompt });
                       
                       // Add user context
                       if (!string.IsNullOrEmpty(context))
                       {
                           conversationHistory.Add(new { role = "system", content = $"User Context: {context}" });
                       }
                       
                       // Add conversation context to maintain continuity
                       conversationHistory.Add(new { role = "system", content = "CRITICAL: You MUST maintain conversation context. If user says 'mötesrum för 10 personer' and then '10 nov', you already have: resource=mötesrum, people=10, date=10 nov. DO NOT ask for these again. Only ask for missing information like time slot." });
                       
                       // Add specific instructions for maintaining user input
                       conversationHistory.Add(new { role = "system", content = "CRITICAL: NEVER change the number of people the user has specified. If user says '6 personer', keep it as 6 throughout the entire conversation. NEVER ask the same question twice. NEVER change user-provided information." });
                       
                       // Add strict instruction to never change user input
                       conversationHistory.Add(new { role = "system", content = "ABSOLUTELY CRITICAL: If user says '11 personer', you MUST use '11 personer' in your response. If user says '7 personer', you MUST use '7 personer' in your response. NEVER change the number the user provided. NEVER use a different number." });
                       
                       // Add strict conversation flow instructions
                       conversationHistory.Add(new { role = "system", content = "CONVERSATION FLOW: 1) Ask for number of people ONCE, 2) Ask for date ONCE, 3) Ask for time ONCE, 4) Give recommendations. NEVER repeat the same question. If user answers '7', you have the number, move to next step." });
                       
                       // Add instruction to handle new requests
                       conversationHistory.Add(new { role = "system", content = "IMPORTANT: When user makes a NEW request (like 'Jag vill boka AI Server'), treat it as a COMPLETELY NEW conversation. Do NOT repeat previous recommendations. Start fresh with the new request." });
                       
                       // Add instruction to maintain context within each conversation
                       conversationHistory.Add(new { role = "system", content = "CRITICAL: When user is booking a specific resource (AI Server, Skrivbord, VR Headset), maintain that context. If user says '3' after asking about AI Server, it means 3 people for AI Server, NOT for previous Mötesrum booking." });
                       
                       // Add recent conversation history if available
                       if (chatHistory != null && chatHistory.Any())
                       {
                           foreach (var msg in chatHistory)
                           {
                               if (msg.IsFromUser)
                               {
                                   conversationHistory.Add(new { role = "user", content = msg.Message });
                               }
                               else
                               {
                                   conversationHistory.Add(new { role = "assistant", content = msg.Response });
                               }
                           }
                       }
                       
                       // Special handling for booking history requests
                       if (message.ToLower().Contains("bokningshistorik") || message.ToLower().Contains("historik"))
                       {
                           conversationHistory.Add(new { role = "system", content = "User is asking for booking history. Provide a direct response based on their booking data." });
                       }
                       
                       // Add conversation context for meeting room booking
                       if (message.ToLower().Contains("mötesrum"))
                       {
                           conversationHistory.Add(new { role = "system", content = "User is asking about meeting rooms. Follow the conversation flow: 1) Ask for number of people ONCE, 2) Ask for date ONCE, 3) Ask for time slot ONCE, 4) Provide specific recommendations. NEVER repeat questions. NEVER give recommendations before asking for time. When asking for time, be clear and concise." });
                       }
                       
                       // Add context for other resource types
                       if (message.ToLower().Contains("ai server"))
                       {
                           conversationHistory.Add(new { role = "system", content = "User is asking about AI Server. This is a NEW request. Start fresh conversation flow for AI Server booking. When user provides details, apply them to AI Server, NOT to previous Mötesrum booking. AI Server is different from Mötesrum - it's a technical resource, not a meeting room." });
                       }
                       
                       if (message.ToLower().Contains("vr headset"))
                       {
                           conversationHistory.Add(new { role = "system", content = "User is asking about VR Headset. This is a NEW request. Start fresh conversation flow for VR Headset booking. When user provides details, apply them to VR Headset, NOT to previous Mötesrum booking." });
                       }
                       
                       if (message.ToLower().Contains("skrivbord"))
                       {
                           conversationHistory.Add(new { role = "system", content = "User is asking about Skrivbord (Desk). This is a NEW request. Start fresh conversation flow for Skrivbord booking. Follow the SAME flow as other resources: 1) Ask for number of people ONCE, 2) Ask for date ONCE, 3) Ask for time slot ONCE, 4) Provide specific recommendations. NEVER give recommendations before asking for time. When user provides details, apply them to Skrivbord, NOT to previous Mötesrum booking." });
                       }
                       
                       // Add context for general questions
                       if (message.ToLower().Contains("vilka resurser") || message.ToLower().Contains("hjälp mig hitta") || message.ToLower().Contains("bästa tiderna"))
                       {
                           conversationHistory.Add(new { role = "system", content = "User is asking a general question. Provide a helpful response about available resources or booking times. Do NOT repeat previous meeting room recommendations." });
                       }
                       
                       // Add specific instruction to prevent question repetition
                       conversationHistory.Add(new { role = "system", content = "STOP REPEATING QUESTIONS: If you have already asked for number of people and user answered, DO NOT ask again. Move to next step. If you have asked for date and user answered, DO NOT ask again. Move to next step." });
                       
                       // Add instruction to maintain resource context
                       conversationHistory.Add(new { role = "system", content = "RESOURCE CONTEXT: When user is booking a specific resource, maintain that context. If user says '3' after asking about AI Server, it means 3 people for AI Server. If user says '10 november' after asking about Skrivbord, it means 10 november for Skrivbord. Do NOT mix contexts between different resources." });
                       
                       // Add instruction to distinguish between resource types
                       conversationHistory.Add(new { role = "system", content = "RESOURCE DISTINCTION: AI Server is a technical resource, not a meeting room. When user asks for AI Server, give AI Server recommendations, NOT meeting room recommendations. Mötesrum is for meetings, AI Server is for technical work. Skrivbord (Desk) is for individual work, NOT for meetings. Do NOT confuse these resources." });
                       
                       // Add instruction for proper conversation flow
                       conversationHistory.Add(new { role = "system", content = "CONVERSATION FLOW: 1) Ask for number of people, 2) Ask for date, 3) Ask for time, 4) Give recommendations. NEVER give recommendations before asking for time. NEVER ask for time after giving recommendations. This applies to ALL resources: Mötesrum, Skrivbord, VR Headset, and AI Server." });
                       
                       // Add instruction to preserve exact user input
                       conversationHistory.Add(new { role = "system", content = "PRESERVE USER INPUT: When giving recommendations, use the EXACT number the user provided. If user said '11 personer', say 'För 11 personer'. If user said '7 personer', say 'För 7 personer'. NEVER change the number." });
                       
                       // Add instruction for clear communication
                       conversationHistory.Add(new { role = "system", content = "COMMUNICATION: Be clear and concise. When asking for time, ask once clearly. Do not repeat the same question in different ways. Keep responses focused and direct." });
                       
                       // Add instruction to maintain current context
                       conversationHistory.Add(new { role = "system", content = "CURRENT CONTEXT: Always remember what the user is currently booking. If user says 'Jag vill boka AI Server', then all subsequent responses should be about AI Server, NOT about previous Mötesrum booking. Maintain the current booking context throughout the conversation." });
                       
                       // Add instruction for simple time questions
                       conversationHistory.Add(new { role = "system", content = "TIME QUESTION: When asking for time, ask simply: 'Vilken tid föredrar du? Förmiddag eller eftermiddag?' Do not include all options in the question. Keep it simple and short." });
                       
                       // Add the current user message
                       conversationHistory.Add(new { role = "user", content = message });

                var requestBody = new
                {
                    model = "gpt-3.5-turbo",
                    messages = conversationHistory.ToArray(),
                    max_tokens = 500,
                    temperature = 0.7
                };

                var json = JsonConvert.SerializeObject(requestBody);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

                var response = await _httpClient.PostAsync("https://api.openai.com/v1/chat/completions", content);
                
                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    var openAIResponse = JsonConvert.DeserializeObject<dynamic>(responseContent);
                    return openAIResponse?.choices?[0]?.message?.content ?? "I'm sorry, I couldn't process your request.";
                }
                else
                {
                    _logger.LogError("OpenAI API error: {StatusCode} - {Content}", 
                        response.StatusCode, await response.Content.ReadAsStringAsync());
                    return "I'm sorry, I'm having trouble connecting to the AI service right now.";
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calling OpenAI API");
                return "I'm sorry, I encountered an error while processing your request.";
            }
        }

        private (string? date, string? timeslot, int? numberOfPeople) ExtractBookingDetailsFromContext(string context)
        {
            string? date = null;
            string? timeslot = null;
            int? numberOfPeople = null;

            // Extract date patterns (YYYY-MM-DD or Swedish date format)
            var dateMatch = System.Text.RegularExpressions.Regex.Match(context, @"(\d{4}-\d{2}-\d{2})|(\d{1,2}\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s+\d{4})", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (dateMatch.Success)
            {
                date = dateMatch.Value;
            }
            else
            {
                // Try to extract date from "16 november" format
                var simpleDateMatch = System.Text.RegularExpressions.Regex.Match(context, @"(\d{1,2})\s+(november|december|januari|februari|mars|april|maj|juni|juli|augusti|september|oktober)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (simpleDateMatch.Success)
                {
                    var day = simpleDateMatch.Groups[1].Value;
                    var month = simpleDateMatch.Groups[2].Value.ToLower();
                    
                    // Convert Swedish month to number
                    var monthMap = new Dictionary<string, string>
                    {
                        {"januari", "01"}, {"februari", "02"}, {"mars", "03"}, {"april", "04"},
                        {"maj", "05"}, {"juni", "06"}, {"juli", "07"}, {"augusti", "08"},
                        {"september", "09"}, {"oktober", "10"}, {"november", "11"}, {"december", "12"}
                    };
                    
                    if (monthMap.ContainsKey(month))
                    {
                        var currentYear = DateTime.Now.Year;
                        date = $"{currentYear}-{monthMap[month]}-{day.PadLeft(2, '0')}";
                    }
                }
            }

            // Extract timeslot
            if (context.ToLower().Contains("förmiddag") || context.ToLower().Contains("morning"))
            {
                timeslot = "FM";
            }
            else if (context.ToLower().Contains("eftermiddag") || context.ToLower().Contains("afternoon"))
            {
                timeslot = "EF";
            }

            // Extract number of people
            var peopleMatch = System.Text.RegularExpressions.Regex.Match(context, @"(\d+)\s*(personer?|person|människor?|people)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (peopleMatch.Success)
            {
                numberOfPeople = int.Parse(peopleMatch.Groups[1].Value);
            }

            return (date, timeslot, numberOfPeople);
        }

        private async Task<List<Resource>> GetAvailableResourcesForDateTime(string? date, string? timeslot)
        {
            if (string.IsNullOrEmpty(date) || string.IsNullOrEmpty(timeslot))
            {
                // If no specific date/time, return all resources
                return await _context.Resources
                    .Include(r => r.ResourceType)
                    .ToListAsync();
            }

            // Parse date
            if (!DateTime.TryParse(date, out var localDate))
            {
                return await _context.Resources
                    .Include(r => r.ResourceType)
                    .ToListAsync();
            }

            // Calculate start and end times
            var startLocal = timeslot == "FM" ? localDate.Date.AddHours(8) : localDate.Date.AddHours(12);
            var endLocal = timeslot == "FM" ? localDate.Date.AddHours(12) : localDate.Date.AddHours(16);
            var startUtc = startLocal.ToUniversalTime();
            var endUtc = endLocal.ToUniversalTime();

            // Get all resources
            var allResources = await _context.Resources
                .Include(r => r.ResourceType)
                .ToListAsync();

            // Filter out resources that are booked during this time
            var bookedResourceIds = await _context.Bookings
                .Where(b => b.IsActive &&
                    ((b.BookingDate <= startUtc && b.EndDate > startUtc) ||
                     (b.BookingDate < endUtc && b.EndDate >= endUtc) ||
                     (b.BookingDate >= startUtc && b.EndDate <= endUtc)))
                .Select(b => b.ResourceId)
                .ToListAsync();

            // Also check for exact matches (same date and timeslot)
            var exactMatches = await _context.Bookings
                .Where(b => b.IsActive && b.BookingDate == startUtc && b.EndDate == endUtc)
                .Select(b => b.ResourceId)
                .ToListAsync();

            // Combine both lists
            var allBookedIds = bookedResourceIds.Union(exactMatches).Distinct().ToList();

            var availableResources = allResources.Where(r => !allBookedIds.Contains(r.ResourceId)).ToList();
            
            // Log for debugging
            _logger.LogInformation("Total resources: {Total}, Booked resources: {Booked}, Available: {Available}", 
                allResources.Count, allBookedIds.Count, availableResources.Count);
            _logger.LogInformation("Booked resource IDs: {BookedIds}", string.Join(", ", allBookedIds));
            _logger.LogInformation("Available resource IDs: {AvailableIds}", 
                string.Join(", ", availableResources.Select(r => r.ResourceId)));
            
            // Log specific meeting rooms availability
            var meetingRooms = availableResources.Where(r => r.ResourceType.Name.ToLower().Contains("mötesrum")).ToList();
            _logger.LogInformation("Available meeting rooms: {MeetingRooms}", 
                string.Join(", ", meetingRooms.Select(r => $"{r.Name} (ID: {r.ResourceId})")));

            return availableResources;
        }

        private async Task GenerateInsightsIfNeededAsync(string userId)
        {
            try
            {
                // Check if we should generate insights (every 10 messages or daily)
                var recentInsights = await _context.AIInsights
                    .Where(i => i.GeneratedAt >= DateTime.UtcNow.AddDays(-1))
                    .CountAsync();

                var recentMessages = await _context.ChatMessages
                    .Where(c => c.UserId == userId && c.Timestamp >= DateTime.UtcNow.AddDays(-1))
                    .CountAsync();

                // Generate insights if we have enough data and haven't generated recently
                if (recentMessages >= 5 && recentInsights < 3)
                {
                    await GenerateUsagePatternInsightAsync();
                    await GenerateResourceRecommendationInsightAsync();
                    await GenerateTrendInsightAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating insights for user {UserId}", userId);
            }
        }

        private async Task GenerateUsagePatternInsightAsync()
        {
            try
            {
                var bookings = await _context.Bookings
                    .Include(b => b.Resource)
                    .Where(b => b.BookingDate >= DateTime.UtcNow.AddDays(-30))
                    .ToListAsync();

                if (bookings.Count < 3) return;

                var popularResources = bookings
                    .GroupBy(b => b.Resource.Name)
                    .OrderByDescending(g => g.Count())
                    .Take(3)
                    .ToList();

                var insight = new AIInsight
                {
                    Title = "Popular Resource Usage",
                    Description = $"Most booked resources: {string.Join(", ", popularResources.Select(g => $"{g.Key} ({g.Count()} bookings)"))}",
                    InsightType = "usage_pattern",
                    Data = JsonConvert.SerializeObject(popularResources.Select(g => new { Resource = g.Key, Count = g.Count() })),
                    GeneratedAt = DateTime.UtcNow,
                    IsActive = true,
                    GeneratedBy = "AI"
                };

                _context.AIInsights.Add(insight);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating usage pattern insight");
            }
        }

        private async Task GenerateResourceRecommendationInsightAsync()
        {
            try
            {
                var underutilizedResources = await _context.Resources
                    .Include(r => r.ResourceType)
                    .Where(r => !r.IsBooked)
                    .Take(3)
                    .ToListAsync();

                if (underutilizedResources.Any())
                {
                    var insight = new AIInsight
                    {
                        Title = "Resource Optimization",
                        Description = $"Consider promoting these underutilized resources: {string.Join(", ", underutilizedResources.Select(r => r.Name))}",
                        InsightType = "recommendation",
                        Data = JsonConvert.SerializeObject(underutilizedResources.Select(r => new { Resource = r.Name, Type = r.ResourceType.Name })),
                        GeneratedAt = DateTime.UtcNow,
                        IsActive = true,
                        GeneratedBy = "AI"
                    };

                    _context.AIInsights.Add(insight);
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating resource recommendation insight");
            }
        }

        private async Task GenerateTrendInsightAsync()
        {
            try
            {
                var recentBookings = await _context.Bookings
                    .Where(b => b.BookingDate >= DateTime.UtcNow.AddDays(-7))
                    .ToListAsync();

                if (recentBookings.Count < 2) return;

                var peakHours = recentBookings
                    .GroupBy(b => b.BookingDate.Hour)
                    .OrderByDescending(g => g.Count())
                    .Take(2)
                    .ToList();

                var insight = new AIInsight
                {
                    Title = "Peak Usage Times",
                    Description = $"Highest booking activity at: {string.Join(", ", peakHours.Select(g => $"{g.Key}:00 ({g.Count()} bookings)"))}",
                    InsightType = "trend",
                    Data = JsonConvert.SerializeObject(peakHours.Select(g => new { Hour = g.Key, Count = g.Count() })),
                    GeneratedAt = DateTime.UtcNow,
                    IsActive = true,
                    GeneratedBy = "AI"
                };

                _context.AIInsights.Add(insight);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating trend insight");
            }
        }
    }
}
