using Microsoft.AspNetCore.Authorization;

namespace backend.Authorization
{
    public class AdminRequirement : IAuthorizationRequirement
    {
        public string RequiredRole { get; } // Krävd roll för auktorisering

        public AdminRequirement(string requiredRole = "Admin") // Konstruktor för Admin-krav
        {
            RequiredRole = requiredRole; // Tilldela krävd roll
        }
    }

    public class AdminAuthorizationHandler : AuthorizationHandler<AdminRequirement>
    {
        private readonly ILogger<AdminAuthorizationHandler> _logger; // Logger för att spåra auktoriseringsaktivitet

        public AdminAuthorizationHandler(ILogger<AdminAuthorizationHandler> logger) // Konstruktor för auktoriseringshanterare
        {
            _logger = logger; // Tilldela logger
        }

        protected override Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            AdminRequirement requirement)
        {
            if (!context.User.Identity?.IsAuthenticated ?? true) // Kontrollera om användaren är autentiserad
            {
                _logger.LogWarning("User is not authenticated"); // Logga varning om användaren inte är autentiserad
                context.Fail(); // Misslyckas med auktorisering
                return Task.CompletedTask; // Returnera slutförd uppgift
            }

            var userRole = context.User.FindFirst("Role")?.Value; // Hämta användarroll från claims
            var userIsActive = context.User.FindFirst("IsActive")?.Value; // Hämta användaraktiv status från claims

            if (string.IsNullOrEmpty(userRole)) // Kontrollera om användarroll finns
            {
                _logger.LogWarning("User role not found in claims"); // Logga varning om användarroll inte hittades
                context.Fail(); // Misslyckas med auktorisering
                return Task.CompletedTask; // Returnera slutförd uppgift
            }

            if (userIsActive != "True") // Kontrollera om användarkonto är aktivt
            {
                _logger.LogWarning("User account is inactive"); // Logga varning om användarkonto är inaktivt
                context.Fail(); // Misslyckas med auktorisering
                return Task.CompletedTask; // Returnera slutförd uppgift
            }

            if (userRole == requirement.RequiredRole || userRole == "SuperAdmin") // Kontrollera om användaren har rätt roll
            {
                _logger.LogInformation("User {UserId} authorized as {Role}", 
                    context.User.FindFirst("sub")?.Value, userRole); // Logga lyckad auktorisering
                context.Succeed(requirement); // Lyckas med auktorisering
            }
            else
            {
                _logger.LogWarning("User {UserId} with role {UserRole} denied access to {RequiredRole}", 
                    context.User.FindFirst("sub")?.Value, userRole, requirement.RequiredRole); // Logga nekad åtkomst
                context.Fail(); // Misslyckas med auktorisering
            }

            return Task.CompletedTask; // Returnera slutförd uppgift
        }
    }
}




