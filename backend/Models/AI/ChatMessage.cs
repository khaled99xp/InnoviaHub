using System.ComponentModel.DataAnnotations;

namespace backend.Models.AI
{
    public class ChatMessage
    {
        public int Id { get; set; } // Unik identifierare för chat-meddelande
        
        [Required]
        public string UserId { get; set; } = string.Empty; // Användar-ID som skickade meddelandet
        
        [Required]
        public string Message { get; set; } = string.Empty; // Meddelandet från användaren
        
        [Required]
        public string Response { get; set; } = string.Empty; // AI-svar på meddelandet
        
        public DateTime Timestamp { get; set; } = DateTime.UtcNow; // Tidpunkt när meddelandet skickades
        
        public string? SessionId { get; set; } // Session-ID för att gruppera relaterade meddelanden
        
        public bool IsFromUser { get; set; } = true; // Om meddelandet kommer från användaren eller AI
        
        public virtual ApplicationUser? User { get; set; } // Navigation property till användare
    }
}



