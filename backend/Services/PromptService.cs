using System.Text.Json;

namespace backend.Services
{
    public class PromptService : IPromptService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<PromptService> _logger;
        private readonly AIPromptsConfig _promptsConfig;

        public PromptService(IConfiguration configuration, ILogger<PromptService> logger)
        {
            _configuration = configuration;
            _logger = logger;
            _promptsConfig = LoadPromptsConfig();
        }

        public string GetSystemPrompt()
        {
            return _promptsConfig.SystemPrompt;
        }

        public string GetNonPlatformResponse()
        {
            return _promptsConfig.NonPlatformResponse;
        }

        public string[] GetPlatformKeywords()
        {
            return _promptsConfig.PlatformKeywords;
        }

        public string[] GetNonPlatformKeywords()
        {
            return _promptsConfig.NonPlatformKeywords;
        }

        public bool IsPlatformRelatedMessage(string message)
        {
            var lowerMessage = message.ToLower();
            
            // Log for debugging
            _logger.LogInformation("=== DEBUGGING PLATFORM MESSAGE CHECK ===");
            _logger.LogInformation("Original message: '{Message}'", message);
            _logger.LogInformation("Lower message: '{LowerMessage}'", lowerMessage);
            _logger.LogInformation("Platform keywords count: {Count}", _promptsConfig.PlatformKeywords?.Length ?? 0);
            _logger.LogInformation("Platform keywords: {Keywords}", string.Join(", ", _promptsConfig.PlatformKeywords ?? new string[0]));
            _logger.LogInformation("Non-platform keywords: {Keywords}", string.Join(", ", _promptsConfig.NonPlatformKeywords ?? new string[0]));
            
            // Check for non-platform keywords first
            var nonPlatformMatches = _promptsConfig.NonPlatformKeywords?.Where(keyword => lowerMessage.Contains(keyword)).ToList() ?? new List<string>();
            if (nonPlatformMatches.Any())
            {
                _logger.LogInformation("Message contains non-platform keywords: {Matches}, returning false", string.Join(", ", nonPlatformMatches));
                return false;
            }

            // Check for platform-related keywords
            var platformMatches = _promptsConfig.PlatformKeywords?.Where(keyword => lowerMessage.Contains(keyword)).ToList() ?? new List<string>();
            _logger.LogInformation("Platform keyword matches: {Matches}", string.Join(", ", platformMatches));
            _logger.LogInformation("Has platform keyword: {HasKeyword}", platformMatches.Any());
            
            return platformMatches.Any();
        }

        private AIPromptsConfig LoadPromptsConfig()
        {
            var promptsPath = Path.Combine(Directory.GetCurrentDirectory(), "Config", "AIPrompts.json");
            
            _logger.LogInformation("=== LOADING PROMPTS CONFIG ===");
            _logger.LogInformation("Loading prompts from: {Path}", promptsPath);
            _logger.LogInformation("Current directory: {CurrentDir}", Directory.GetCurrentDirectory());
            
            if (!File.Exists(promptsPath))
            {
                _logger.LogError("AIPrompts.json not found at: {Path}", promptsPath);
                throw new FileNotFoundException($"AIPrompts.json file not found at: {promptsPath}");
            }

            var jsonContent = File.ReadAllText(promptsPath);
            _logger.LogInformation("File content length: {Length}", jsonContent.Length);
            _logger.LogInformation("File content preview: {Preview}", jsonContent.Substring(0, Math.Min(200, jsonContent.Length)));
            
            var config = JsonSerializer.Deserialize<AIPromptsConfig>(jsonContent, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (config == null)
            {
                _logger.LogError("Failed to deserialize AIPrompts.json");
                throw new InvalidOperationException("Failed to deserialize AIPrompts.json");
            }

            _logger.LogInformation("Successfully loaded config with {PlatformCount} platform keywords and {NonPlatformCount} non-platform keywords", 
                config.PlatformKeywords?.Length ?? 0, config.NonPlatformKeywords?.Length ?? 0);
            _logger.LogInformation("Platform keywords: {Keywords}", string.Join(", ", config.PlatformKeywords ?? new string[0]));

            return config;
        }

    }

    public class AIPromptsConfig
    {
        public string SystemPrompt { get; set; } = string.Empty;
        public string NonPlatformResponse { get; set; } = string.Empty;
        public string[] PlatformKeywords { get; set; } = Array.Empty<string>();
        public string[] NonPlatformKeywords { get; set; } = Array.Empty<string>();
    }
}
