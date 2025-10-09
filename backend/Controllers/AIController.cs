using Microsoft.AspNetCore.Mvc;
// Importerar MVC-kontrollerfunktioner
using Microsoft.AspNetCore.Authorization;
// Importerar auktoriseringsfunktioner
using backend.Services;
// Importerar service-gränssnitt
using backend.DTOs.AI;
// Importerar AI Data Transfer Objects
using System.Security.Claims;
// Importerar Claims för användaridentifikation

namespace backend.Controllers
{
    [ApiController]
    // Markerar som API-kontroller
    [Route("api/[controller]")]
    // Definierar API-rutt för AI-kontrollern
    [Authorize]
    // Kräver autentisering för alla endpoints
    public class AIController : ControllerBase
    {
        private readonly IAIService _aiService;
        // Privat fält för AI service
        private readonly ILogger<AIController> _logger;
        // Privat fält för logger

        public AIController(IAIService aiService, ILogger<AIController> logger)
        // Konstruktor som tar emot AI service och logger
        {
            _aiService = aiService;
            // Tilldelar AI service till privat fält
            _logger = logger;
            // Tilldelar logger till privat fält
        }

        [HttpPost("chat")]
        // HTTP POST-metod för chat-funktionalitet
        public async Task<IActionResult> Chat([FromBody] ChatRequestDto request)
        // Asynkron metod för att hantera chat-meddelanden
        {
            try
            // Börjar try-catch block för felhantering
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                // Hämtar användar-ID från JWT token
                if (string.IsNullOrEmpty(userId))
                // Kontrollerar om användar-ID finns
                    return Unauthorized("User not authenticated");
                    // Returnerar unauthorized om användare inte är autentiserad

                var response = await _aiService.ProcessChatMessageAsync(userId, request);
                // Processar chat-meddelandet genom AI service
                return Ok(response);
                // Returnerar AI response
            }
            catch (Exception ex)
            // Fångar undantag
            {
                _logger.LogError(ex, "Error processing chat message");
                // Loggar chat-fel
                return StatusCode(500, "Internal server error");
                // Returnerar server error
            }
        }

        [HttpGet("insights")]
        // HTTP GET-metod för att hämta AI insights
        public async Task<IActionResult> GetInsights()
        // Asynkron metod för att hämta AI insights
        {
            try
            // Börjar try-catch block för felhantering
            {
                var insights = await _aiService.GetInsightsAsync();
                // Hämtar alla aktiva AI insights från databasen
                return Ok(insights);
                // Returnerar insights
            }
            catch (Exception ex)
            // Fångar undantag
            {
                _logger.LogError(ex, "Error getting insights");
                // Loggar insights-fel
                return StatusCode(500, "Internal server error");
                // Returnerar server error
            }
        }

        [HttpGet("recommendations")]
        // HTTP GET-metod för att hämta rekommendationer
        public async Task<IActionResult> GetRecommendations()
        // Asynkron metod för att hämta AI rekommendationer
        {
            try
            // Börjar try-catch block för felhantering
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                // Hämtar användar-ID för att få personliga rekommendationer
                if (string.IsNullOrEmpty(userId))
                // Kontrollerar om användar-ID finns
                    return Unauthorized("User not authenticated");
                    // Returnerar unauthorized om användare inte är autentiserad

                var recommendations = await _aiService.GetRecommendationsAsync(userId);
                // Hämtar AI-genererade rekommendationer baserat på användarens historik
                return Ok(recommendations);
                // Returnerar rekommendationer
            }
            catch (Exception ex)
            // Fångar undantag
            {
                _logger.LogError(ex, "Error getting recommendations");
                // Loggar rekommendations-fel
                return StatusCode(500, "Internal server error");
                // Returnerar server error
            }
        }

        [HttpGet("analytics")]
        // HTTP GET-metod för att hämta analytics
        [Authorize(Roles = "Admin,SuperAdmin")]
        // Endast administratörer kan komma åt
        public async Task<IActionResult> GetAnalytics()
        // Asynkron metod för att hämta AI analytics
        {
            try
            // Börjar try-catch block för felhantering
            {
                var analytics = await _aiService.GetAnalyticsAsync();
                // Hämtar omfattande AI analytics för administratörs-dashboard
                return Ok(analytics);
                // Returnerar analytics
            }
            catch (Exception ex)
            // Fångar undantag
            {
                _logger.LogError(ex, "Error getting analytics");
                // Loggar analytics-fel
                return StatusCode(500, "Internal server error");
                // Returnerar server error
            }
        }

        [HttpPost("generate-recommendation")]
        // HTTP POST-metod för att generera rekommendation
        public async Task<IActionResult> GenerateRecommendation([FromBody] string context)
        // Asynkron metod för att generera AI rekommendation
        {
            try
            // Börjar try-catch block för felhantering
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                // Verifierar användarautentisering
                if (string.IsNullOrEmpty(userId))
                // Kontrollerar om användar-ID finns
                    return Unauthorized("User not authenticated");
                    // Returnerar unauthorized om användare inte är autentiserad

                var recommendation = await _aiService.GenerateResourceRecommendationAsync(userId, context);
                // Genererar AI-rekommendation baserat på kontext och användarhistorik
                return Ok(new { recommendation });
                // Returnerar rekommendation
            }
            catch (Exception ex)
            // Fångar undantag
            {
                _logger.LogError(ex, "Error generating recommendation");
                // Loggar rekommendations-genererings-fel
                return StatusCode(500, "Internal server error");
                // Returnerar server error
            }
        }

        [HttpGet("analyze-patterns")]
        // HTTP GET-metod för att analysera mönster
        [Authorize(Roles = "Admin,SuperAdmin")]
        // Endast administratörer kan köra analys
        public async Task<IActionResult> AnalyzePatterns()
        // Asynkron metod för att analysera bokningsmönster
        {
            try
            // Börjar try-catch block för felhantering
            {
                var analysis = await _aiService.AnalyzeBookingPatternsAsync();
                // Kör AI-analys av bokningsmönster för att identifiera trender
                return Ok(new { analysis });
                // Returnerar analys
            }
            catch (Exception ex)
            // Fångar undantag
            {
                _logger.LogError(ex, "Error analyzing patterns");
                // Loggar analys-fel
                return StatusCode(500, "Internal server error");
                // Returnerar server error
            }
        }

        [HttpGet("suggestions")]
        // HTTP GET-metod för att hämta förslag
        public async Task<IActionResult> GetSuggestions()
        // Asynkron metod för att hämta AI förslag
        {
            try
            // Börjar try-catch block för felhantering
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                // Hämtar användar-ID för personliga förslag
                if (string.IsNullOrEmpty(userId))
                // Kontrollerar om användar-ID finns
                    return Unauthorized("User not authenticated");
                    // Returnerar unauthorized om användare inte är autentiserad

                var suggestions = await _aiService.GetChatSuggestionsAsync(userId);
                // Hämtar AI-genererade chat-förslag baserat på användarens behov
                return Ok(suggestions);
                // Returnerar förslag
            }
            catch (Exception ex)
            // Fångar undantag
            {
                _logger.LogError(ex, "Error getting suggestions");
                // Loggar förslag-fel
                return StatusCode(500, "Internal server error");
                // Returnerar server error
            }
        }

        [HttpGet("health")]
        // HTTP GET-metod för health check
        public IActionResult HealthCheck()
        // Metod för att kontrollera service status
        {
            return Ok(new { 
                message = "AI Service is running", 
                timestamp = DateTime.UtcNow,
                status = "healthy"
            });
            // Returnerar service status för övervakning
        }
    }
    // Slut på AIController-klassen
}
// Slut på namespace



