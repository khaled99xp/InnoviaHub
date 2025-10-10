namespace backend.Services
{
    public interface IPromptService
    {
        string GetSystemPrompt();
        string GetNonPlatformResponse();
        string[] GetPlatformKeywords();
        string[] GetNonPlatformKeywords();
        bool IsPlatformRelatedMessage(string message);
    }
}

