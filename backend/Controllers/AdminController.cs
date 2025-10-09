using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using backend.Models;
using backend.DTOs;
using backend.Models.DTOs;
using backend.Utils;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using System.ComponentModel.DataAnnotations;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    [Produces("application/json")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService; // Admin service för användarhantering
        private readonly UserManager<ApplicationUser> _userManager; // User manager för användaroperationer
        private readonly RoleManager<IdentityRole> _roleManager; // Role manager för rollhantering
        private readonly IJwtTokenManager _jwtTokenManager; // JWT token manager för autentisering
        private readonly ILogger<AdminController> _logger; // Logger för att spåra aktivitet

        public AdminController(
            IAdminService adminService,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            IJwtTokenManager jwtTokenManager,
            ILogger<AdminController> logger)
        {
            _adminService = adminService; // Tilldela admin service
            _userManager = userManager; // Tilldela user manager
            _roleManager = roleManager; // Tilldela role manager
            _jwtTokenManager = jwtTokenManager; // Tilldela JWT token manager
            _logger = logger; // Tilldela logger
        }

        [HttpGet("users")]
        [ProducesResponseType(typeof(PagedResultDto<AdminUserDto>), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> GetUsers([FromQuery] UserSearchDto searchDto)
        {
            try
            {
                if (!ModelState.IsValid) // Kontrollera om modellvalidering är giltig
                {
                    return BadRequest(new ApiResponseDto<object>
                    {
                        Success = false,
                        Message = "Invalid data provided",
                        Errors = ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)).ToList()
                    }); // Returnera fel om validering misslyckas
                }

                var result = await _adminService.GetUsersAsync(searchDto); // Hämta användare via admin service
                return Ok(new ApiResponseDto<PagedResultDto<AdminUserDto>>
                {
                    Success = true,
                    Message = "Users retrieved successfully",
                    Data = result
                }); // Returnera användare som OK response
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting users"); // Logga fel vid hämtning av användare
                return StatusCode(500, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "An error occurred while retrieving users",
                    Errors = new List<string> { ex.Message }
                }); // Returnera serverfel
            }
        }

        [HttpGet("users/{id}")]
        [ProducesResponseType(typeof(AdminUserDto), 200)]
        [ProducesResponseType(404)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> GetUserById(string id)
        {
            try
            {
                var user = await _adminService.GetUserByIdAsync(id); // Hämta användare via ID
                if (user == null) // Kontrollera om användare finns
                {
                    return NotFound(new ApiResponseDto<object>
                    {
                        Success = false,
                        Message = "User not found",
                        Errors = new List<string> { "User not found" }
                    }); // Returnera 404 om användare inte hittades
                }

                return Ok(new ApiResponseDto<AdminUserDto>
                {
                    Success = true,
                    Message = "User retrieved successfully",
                    Data = user
                }); // Returnera användare som OK response
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user by ID: {UserId}", id); // Logga fel vid hämtning av användare
                return StatusCode(500, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "An error occurred while retrieving user",
                    Errors = new List<string> { ex.Message }
                }); // Returnera serverfel
            }
        }

        [HttpPost("users")]
        [ProducesResponseType(typeof(AdminUserDto), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserDto createUserDto)
        {
            try
            {
                if (!ModelState.IsValid) // Kontrollera om modellvalidering är giltig
                {
                    return BadRequest(new ApiResponseDto<object>
                    {
                        Success = false,
                        Message = "Invalid data provided",
                        Errors = ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)).ToList()
                    }); // Returnera fel om validering misslyckas
                }

                var result = await _adminService.CreateUserAsync(createUserDto); // Skapa användare via admin service
                if (!result.Success) // Kontrollera om skapandet lyckades
                {
                    return BadRequest(result); // Returnera fel om skapandet misslyckades
                }

                return CreatedAtAction(nameof(GetUserById), new { id = result.Data!.Id }, result); // Returnera skapad användare
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating user"); // Logga fel vid skapande av användare
                return StatusCode(500, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "An error occurred while creating user",
                    Errors = new List<string> { ex.Message }
                }); // Returnera serverfel
            }
        }

        [HttpPut("users/{id}")]
        [ProducesResponseType(typeof(AdminUserDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserDto updateUserDto)
        {
            try
            {
                if (!ModelState.IsValid) // Kontrollera om modellvalidering är giltig
                {
                    return BadRequest(new ApiResponseDto<object>
                    {
                        Success = false,
                        Message = "Invalid data provided",
                        Errors = ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)).ToList()
                    }); // Returnera fel om validering misslyckas
                }

                var result = await _adminService.UpdateUserAsync(id, updateUserDto); // Uppdatera användare via admin service
                if (!result.Success) // Kontrollera om uppdateringen lyckades
                {
                    return result.Data == null ? NotFound(result) : BadRequest(result); // Returnera 404 eller 400 baserat på resultat
                }

                return Ok(result); // Returnera uppdaterad användare
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user: {UserId}", id); // Logga fel vid uppdatering av användare
                return StatusCode(500, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "An error occurred while updating user",
                    Errors = new List<string> { ex.Message }
                }); // Returnera serverfel
            }
        }

        [HttpPut("users/{id}/role")]
        public async Task<IActionResult> UpdateUserRole(string id, [FromBody] UpdateRoleDto updateRoleDto)
        {
            var user = await _userManager.FindByIdAsync(id); // Hämta användare via ID
            if (user == null) // Kontrollera om användare finns
                return NotFound("User not found"); // Returnera 404 om användare inte hittades

            var roleExists = await _roleManager.RoleExistsAsync(updateRoleDto.Role); // Kontrollera om rollen finns
            if (!roleExists) // Kontrollera om rollen existerar
                return BadRequest("Role does not exist"); // Returnera fel om rollen inte finns

            var currentRoles = await _userManager.GetRolesAsync(user); // Hämta nuvarande roller
            if (currentRoles.Any()) // Kontrollera om användaren har roller
            {
                await _userManager.RemoveFromRolesAsync(user, currentRoles); // Ta bort nuvarande roller
            }

            await _userManager.AddToRoleAsync(user, updateRoleDto.Role); // Lägg till ny roll

            user.Role = updateRoleDto.Role; // Uppdatera användarroll
            user.UpdatedAt = DateTime.UtcNow; // Uppdatera tidsstämpel

            var result = await _userManager.UpdateAsync(user); // Uppdatera användare
            if (!result.Succeeded) // Kontrollera om uppdateringen lyckades
                return BadRequest(result.Errors); // Returnera fel om uppdateringen misslyckades

            return Ok(new
            {
                message = "User role updated successfully",
                user = new
                {
                    user.Id,
                    user.Email,
                    user.FirstName,
                    user.LastName,
                    user.Role,
                    user.IsActive,
                    user.UpdatedAt
                }
            }); // Returnera uppdaterad användare
        }

        [HttpPut("users/{id}/status")]
        public async Task<IActionResult> UpdateUserStatus(string id, [FromBody] UpdateStatusDto updateStatusDto)
        {
            var user = await _userManager.FindByIdAsync(id); // Hämta användare via ID
            if (user == null) // Kontrollera om användare finns
                return NotFound("User not found"); // Returnera 404 om användare inte hittades

            user.IsActive = updateStatusDto.IsActive; // Uppdatera användarstatus
            user.UpdatedAt = DateTime.UtcNow; // Uppdatera tidsstämpel

            var result = await _userManager.UpdateAsync(user); // Uppdatera användare
            if (!result.Succeeded) // Kontrollera om uppdateringen lyckades
                return BadRequest(result.Errors); // Returnera fel om uppdateringen misslyckades

            return Ok(new
            {
                message = "User status updated successfully",
                user = new
                {
                    user.Id,
                    user.Email,
                    user.FirstName,
                    user.LastName,
                    user.Role,
                    user.IsActive,
                    user.UpdatedAt
                }
            }); // Returnera uppdaterad användare
        }

        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(id); // Hämta användare via ID
                if (user == null) // Kontrollera om användare finns
                    return NotFound(new ApiResponseDto<object>
                    {
                        Success = false,
                        Message = "User not found"
                    }); // Returnera 404 om användare inte hittades

                var result = await _userManager.DeleteAsync(user); // Ta bort användare
                if (!result.Succeeded) // Kontrollera om borttagningen lyckades
                    return BadRequest(new ApiResponseDto<object>
                    {
                        Success = false,
                        Message = "Failed to delete user",
                        Errors = result.Errors.Select(e => e.Description).ToList()
                    }); // Returnera fel om borttagningen misslyckades

                return Ok(new ApiResponseDto<object>
                {
                    Success = true,
                    Message = "User deleted successfully",
                    Data = null
                }); // Returnera lyckat resultat
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting user {UserId}", id); // Logga fel vid borttagning av användare
                return StatusCode(500, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "An error occurred while deleting the user",
                    Errors = new List<string> { ex.Message }
                }); // Returnera serverfel
            }
        }

        [HttpGet("roles")]
        public async Task<IActionResult> GetAllRoles()
        {
            var roles = await _roleManager.Roles
                .Select(r => new { r.Id, r.Name })
                .ToListAsync(); // Hämta alla roller från databasen

            return Ok(roles); // Returnera roller som OK response
        }

        [HttpPost("roles")]
        public async Task<IActionResult> CreateRole([FromBody] CreateRoleDto createRoleDto)
        {
            if (await _roleManager.RoleExistsAsync(createRoleDto.Name)) // Kontrollera om rollen redan finns
                return BadRequest("Role already exists"); // Returnera fel om rollen redan finns

            var role = new IdentityRole(createRoleDto.Name); // Skapa ny roll
            var result = await _roleManager.CreateAsync(role); // Skapa roll i databasen

            if (!result.Succeeded) // Kontrollera om skapandet lyckades
                return BadRequest(result.Errors); // Returnera fel om skapandet misslyckades

            return Ok(new
            {
                message = "Role created successfully",
                role = new { role.Id, role.Name }
            }); // Returnera skapad roll
        }

        [HttpGet("dashboard")]
        [ProducesResponseType(typeof(AdminDashboardDto), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> GetDashboard()
        {
            try
            {
                var dashboardData = await _adminService.GetDashboardDataAsync(); // Hämta dashboard data via admin service

                return Ok(new ApiResponseDto<AdminDashboardDto>
                {
                    Success = true,
                    Message = "Dashboard data retrieved successfully",
                    Data = dashboardData
                }); // Returnera dashboard data som OK response
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting dashboard data: {Message}", ex.Message); // Logga fel vid hämtning av dashboard data
                return StatusCode(500, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "An error occurred while retrieving dashboard data",
                    Errors = new List<string> { ex.Message }
                }); // Returnera serverfel
            }
        }

        [HttpGet("bookings/stats")]
        [ProducesResponseType(typeof(BookingStatsDto), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> GetBookingStats()
        {
            try
            {
                var stats = await _adminService.GetBookingStatsAsync(); // Hämta bokningsstatistik via admin service
                return Ok(new ApiResponseDto<BookingStatsDto>
                {
                    Success = true,
                    Message = "Booking statistics retrieved successfully",
                    Data = stats
                }); // Returnera bokningsstatistik som OK response
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting booking stats"); // Logga fel vid hämtning av bokningsstatistik
                return StatusCode(500, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "An error occurred while retrieving booking statistics",
                    Errors = new List<string> { ex.Message }
                }); // Returnera serverfel
            }
        }

        [HttpGet("bookings")]
        [ProducesResponseType(typeof(PagedResultDto<AdminBookingDto>), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> GetBookings([FromQuery] BookingSearchDto searchDto)
        {
            try
            {
                if (!ModelState.IsValid) // Kontrollera om modellvalidering är giltig
                {
                    return BadRequest(new ApiResponseDto<object>
                    {
                        Success = false,
                        Message = "Invalid data provided",
                        Errors = ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)).ToList()
                    }); // Returnera fel om validering misslyckas
                }

                var result = await _adminService.GetBookingsAsync(searchDto); // Hämta bokningar via admin service
                return Ok(new ApiResponseDto<PagedResultDto<AdminBookingDto>>
                {
                    Success = true,
                    Message = "Bookings retrieved successfully",
                    Data = result
                }); // Returnera bokningar som OK response
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting bookings"); // Logga fel vid hämtning av bokningar
                return StatusCode(500, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "An error occurred while retrieving bookings",
                    Errors = new List<string> { ex.Message }
                }); // Returnera serverfel
            }
        }

        [HttpPost("bookings/{bookingId}/cancel")]
        [ProducesResponseType(typeof(ApiResponseDto<bool>), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> CancelBooking(int bookingId, [FromBody] string reason)
        {
            try
            {
                var result = await _adminService.CancelBookingAsync(bookingId, reason); // Avbryt bokning via admin service
                if (!result.Success) // Kontrollera om avbrytandet lyckades
                {
                    return result.Data == false ? NotFound(result) : BadRequest(result); // Returnera 404 eller 400 baserat på resultat
                }

                return Ok(result); // Returnera lyckat resultat
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling booking: {BookingId}", bookingId); // Logga fel vid avbrytande av bokning
                return StatusCode(500, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "An error occurred while cancelling booking",
                    Errors = new List<string> { ex.Message }
                }); // Returnera serverfel
            }
        }

        [HttpPost("system/cleanup")]
        [ProducesResponseType(typeof(ApiResponseDto<bool>), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> CleanupExpiredBookings()
        {
            try
            {
                var result = await _adminService.CleanupExpiredBookingsAsync(); // Rensa ut utgångna bokningar via admin service
                return Ok(result); // Returnera resultat som OK response
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cleaning up expired bookings"); // Logga fel vid rensning av utgångna bokningar
                return StatusCode(500, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "An error occurred while cleaning up expired bookings",
                    Errors = new List<string> { ex.Message }
                }); // Returnera serverfel
            }
        }

        [HttpGet("system/logs")]
        [ProducesResponseType(typeof(List<string>), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> GetSystemLogs([FromQuery] int count = 100)
        {
            try
            {
                var logs = await _adminService.GetSystemLogsAsync(count); // Hämta systemloggar via admin service
                return Ok(new ApiResponseDto<List<string>>
                {
                    Success = true,
                    Message = "System logs retrieved successfully",
                    Data = logs
                }); // Returnera systemloggar som OK response
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting system logs"); // Logga fel vid hämtning av systemloggar
                return StatusCode(500, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "An error occurred while retrieving system logs",
                    Errors = new List<string> { ex.Message }
                }); // Returnera serverfel
            }
        }


        [HttpGet("resources")]
        [ProducesResponseType(typeof(ApiResponseDto<PagedResultDto<AdminResourceDto>>), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> GetResources(int page = 1, int pageSize = 10)
        {
            try
            {
                var result = await _adminService.GetResourcesAsync(page, pageSize); // Hämta resurser via admin service
                return Ok(new ApiResponseDto<PagedResultDto<AdminResourceDto>>
                {
                    Success = true,
                    Message = "Resources retrieved successfully",
                    Data = result
                }); // Returnera resurser som OK response
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting resources"); // Logga fel vid hämtning av resurser
                return StatusCode(500, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "An error occurred while getting resources",
                    Errors = new List<string> { ex.Message }
                }); // Returnera serverfel
            }
        }

        [HttpGet("resource-types")]
        [ProducesResponseType(typeof(ApiResponseDto<List<ResourceTypeDto>>), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> GetResourceTypes()
        {
            try
            {
                var result = await _adminService.GetResourceTypesAsync(); // Hämta resurstyper via admin service
                return Ok(new ApiResponseDto<List<ResourceTypeDto>>
                {
                    Success = true,
                    Message = "Resource types retrieved successfully",
                    Data = result
                }); // Returnera resurstyper som OK response
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting resource types"); // Logga fel vid hämtning av resurstyper
                return StatusCode(500, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "An error occurred while getting resource types",
                    Errors = new List<string> { ex.Message }
                }); // Returnera serverfel
            }
        }

        [HttpGet("resources/{id}")]
        [ProducesResponseType(typeof(ApiResponseDto<AdminResourceDto>), 200)]
        [ProducesResponseType(404)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> GetResourceById(int id)
        {
            try
            {
                var resource = await _adminService.GetResourceByIdAsync(id); // Hämta resurs via ID
                if (resource == null) // Kontrollera om resurs finns
                {
                    return NotFound(new ApiResponseDto<object>
                    {
                        Success = false,
                        Message = "Resource not found",
                        Errors = new List<string> { "Resource not found" }
                    }); // Returnera 404 om resurs inte hittades
                }

                return Ok(new ApiResponseDto<AdminResourceDto>
                {
                    Success = true,
                    Message = "Resource retrieved successfully",
                    Data = resource
                }); // Returnera resurs som OK response
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting resource by ID: {ResourceId}", id); // Logga fel vid hämtning av resurs
                return StatusCode(500, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "An error occurred while retrieving resource",
                    Errors = new List<string> { ex.Message }
                }); // Returnera serverfel
            }
        }

        [HttpPost("resources")]
        [ProducesResponseType(typeof(ApiResponseDto<AdminResourceDto>), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> CreateResource([FromBody] CreateResourceDto createResourceDto)
        {
            try
            {
                if (!ModelState.IsValid) // Kontrollera om modellvalidering är giltig
                {
                    return BadRequest(new ApiResponseDto<object>
                    {
                        Success = false,
                        Message = "Invalid data provided",
                        Errors = ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)).ToList()
                    }); // Returnera fel om validering misslyckas
                }

                var result = await _adminService.CreateResourceAsync(createResourceDto); // Skapa resurs via admin service
                if (!result.Success) // Kontrollera om skapandet lyckades
                {
                    return BadRequest(result); // Returnera fel om skapandet misslyckades
                }

                return CreatedAtAction(nameof(GetResourceById), new { id = result.Data!.ResourceId }, result); // Returnera skapad resurs
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating resource"); // Logga fel vid skapande av resurs
                return StatusCode(500, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "An error occurred while creating resource",
                    Errors = new List<string> { ex.Message }
                }); // Returnera serverfel
            }
        }

        [HttpPut("resources/{id}")]
        [ProducesResponseType(typeof(ApiResponseDto<AdminResourceDto>), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> UpdateResource(int id, [FromBody] UpdateResourceDto updateResourceDto)
        {
            try
            {
                if (!ModelState.IsValid) // Kontrollera om modellvalidering är giltig
                {
                    return BadRequest(new ApiResponseDto<object>
                    {
                        Success = false,
                        Message = "Invalid data provided",
                        Errors = ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)).ToList()
                    }); // Returnera fel om validering misslyckas
                }

                var result = await _adminService.UpdateResourceAsync(id, updateResourceDto); // Uppdatera resurs via admin service
                if (!result.Success) // Kontrollera om uppdateringen lyckades
                {
                    return result.Data == null ? NotFound(result) : BadRequest(result); // Returnera 404 eller 400 baserat på resultat
                }

                return Ok(result); // Returnera uppdaterad resurs
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating resource: {ResourceId}", id); // Logga fel vid uppdatering av resurs
                return StatusCode(500, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "An error occurred while updating resource",
                    Errors = new List<string> { ex.Message }
                }); // Returnera serverfel
            }
        }

        [HttpDelete("resources/{id}")]
        [ProducesResponseType(typeof(ApiResponseDto<bool>), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> DeleteResource(int id)
        {
            try
            {
                var result = await _adminService.DeleteResourceAsync(id); // Ta bort resurs via admin service
                if (!result.Success) // Kontrollera om borttagningen lyckades
                {
                    return result.Data == false ? NotFound(result) : BadRequest(result); // Returnera 404 eller 400 baserat på resultat
                }

                return Ok(result); // Returnera lyckat resultat
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting resource: {ResourceId}", id); // Logga fel vid borttagning av resurs
                return StatusCode(500, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "An error occurred while deleting resource",
                    Errors = new List<string> { ex.Message }
                }); // Returnera serverfel
            }
        }

        [HttpPost("auth/logout")]
        [ProducesResponseType(typeof(ApiResponseDto<object>), 200)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> Logout()
        {
            try
            {
                _logger.LogInformation("Admin user logout"); // Logga admin-utloggning
                
                return Ok(new ApiResponseDto<object>
                {
                    Success = true,
                    Message = "Logged out successfully",
                    Data = null,
                    Timestamp = DateTime.UtcNow
                }); // Returnera lyckat utloggningsresultat
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during logout"); // Logga fel vid utloggning
                return StatusCode(500, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "An error occurred during logout",
                    Errors = new List<string> { ex.Message },
                    Timestamp = DateTime.UtcNow
                }); // Returnera serverfel
            }
        }
    }
}
