using System.ComponentModel.DataAnnotations;

namespace backend.Models.AI
{
    public class ResourceRecommendation
    {
        public int Id { get; set; } // Unik identifierare för rekommendation
        
        [Required]
        public string UserId { get; set; } = string.Empty; // Användar-ID som rekommendationen tillhör
        
        public int ResourceId { get; set; } // Resurs-ID som rekommenderas
        
        [Required]
        public string RecommendationType { get; set; } = string.Empty; // Typ av rekommendation: "similar_usage", "popular", "available"
        
        [Required]
        public string Reason { get; set; } = string.Empty; // Anledning till rekommendationen
        
        public double ConfidenceScore { get; set; } // Förtroendepoäng för rekommendationen (0-1)
        
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow; // Tidpunkt när rekommendationen genererades
        
        public bool IsActive { get; set; } = true; // Om rekommendationen är aktiv
        
        public bool IsViewed { get; set; } = false; // Om användaren har sett rekommendationen
        
        public virtual ApplicationUser? User { get; set; } // Navigation property till användare
        public virtual Resource? Resource { get; set; } // Navigation property till resurs
    }
}



