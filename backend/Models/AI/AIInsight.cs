using System.ComponentModel.DataAnnotations;

namespace backend.Models.AI
{
    public class AIInsight
    {
        public int Id { get; set; } // Unik identifierare för AI-insikt
        
        [Required]
        public string Title { get; set; } = string.Empty; // Titel för insikten
        
        [Required]
        public string Description { get; set; } = string.Empty; // Beskrivning av insikten
        
        [Required]
        public string InsightType { get; set; } = string.Empty; // Typ av insikt: "usage_pattern", "recommendation", "trend"
        
        public string? Data { get; set; } // JSON-data för insikten
        
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow; // Tidpunkt när insikten genererades
        
        public bool IsActive { get; set; } = true; // Om insikten är aktiv
        
        public string? GeneratedBy { get; set; } // Om insikten genererades av AI eller manuellt
    }
}
