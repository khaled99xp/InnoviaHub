using backend.DTOs.AI;

namespace backend.Services
{
    public interface IAIService
    {
        Task<ChatResponseDto> ProcessChatMessageAsync(string userId, ChatRequestDto request); // Bearbeta chat-meddelande och returnera AI-svar
        Task<List<AIInsightDto>> GetInsightsAsync(); // Hämta AI-insikter och analyser
        Task<List<ResourceRecommendationDto>> GetRecommendationsAsync(string userId); // Hämta AI-baserade resursrekommendationer för användaren
        Task<AIAnalyticsDto> GetAnalyticsAsync(); // Hämta AI-analytics och statistik
        Task<string> GenerateResourceRecommendationAsync(string userId, string context); // Generera AI-baserad resursrekommendation baserat på kontext
        Task<string> AnalyzeBookingPatternsAsync(); // Analysera bokningsmönster och generera insights
        Task<List<string>> GetChatSuggestionsAsync(string userId); // Hämta AI chat-förslag för användaren
    }
}



