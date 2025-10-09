namespace backend.DTOs.AI
{
    public class ChatRequestDto
    {
        public string Message { get; set; } = string.Empty; // Meddelande från användaren
        public string? SessionId { get; set; } // Session-ID för att gruppera meddelanden
        public string? Context { get; set; } // Ytterligare kontext för AI:n
    }

    public class ChatResponseDto
    {
        public string Response { get; set; } = string.Empty; // AI-svar på meddelandet
        public string SessionId { get; set; } = string.Empty; // Session-ID för att gruppera meddelanden
        public DateTime Timestamp { get; set; } = DateTime.UtcNow; // Tidpunkt för svaret
        public List<string>? Suggestions { get; set; } // Förslag för användaren
    }

    public class AIInsightDto
    {
        public int Id { get; set; } // Unik identifierare för insikt
        public string Title { get; set; } = string.Empty; // Titel för insikten
        public string Description { get; set; } = string.Empty; // Beskrivning av insikten
        public string InsightType { get; set; } = string.Empty; // Typ av insikt
        public string? Data { get; set; } // JSON-data för insikten
        public DateTime GeneratedAt { get; set; } // Tidpunkt när insikten genererades
        public bool IsActive { get; set; } // Om insikten är aktiv
    }

    public class ResourceRecommendationDto
    {
        public int Id { get; set; } // Unik identifierare för rekommendation
        public int ResourceId { get; set; } // Resurs-ID som rekommenderas
        public string ResourceName { get; set; } = string.Empty; // Namn på resursen
        public string ResourceType { get; set; } = string.Empty; // Typ av resurs
        public string RecommendationType { get; set; } = string.Empty; // Typ av rekommendation
        public string Reason { get; set; } = string.Empty; // Anledning till rekommendationen
        public double ConfidenceScore { get; set; } // Förtroendepoäng för rekommendationen
        public DateTime GeneratedAt { get; set; } // Tidpunkt när rekommendationen genererades
        public bool IsViewed { get; set; } // Om användaren har sett rekommendationen
    }

    public class AIAnalyticsDto
    {
        public int TotalChatMessages { get; set; } // Totalt antal chat-meddelanden
        public int TotalRecommendations { get; set; } // Totalt antal rekommendationer
        public int ActiveInsights { get; set; } // Antal aktiva insikter
        public List<string> PopularTopics { get; set; } = new(); // Populära ämnen
        public Dictionary<string, int> UsageByHour { get; set; } = new(); // Användning per timme
        public List<AIInsightDto> RecentInsights { get; set; } = new(); // Senaste insikter
    }
}



