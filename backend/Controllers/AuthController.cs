using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using backend.Models;
using backend.DTOs;
using Microsoft.EntityFrameworkCore;
using backend.Utils;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager; // User manager för användaroperationer
        private readonly SignInManager<ApplicationUser> _signInManager; // Sign in manager för inloggning
        private readonly IJwtTokenManager _jwtTokenManager; // JWT token manager för autentisering

        public AuthController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IJwtTokenManager jwtTokenManager)
        {
            _userManager = userManager; // Tilldela user manager
            _signInManager = signInManager; // Tilldela sign in manager
            _jwtTokenManager = jwtTokenManager; // Tilldela JWT token manager
        }

        [HttpGet("health")]
        public IActionResult HealthCheck()
        {
            return Ok(new { 
                message = "API is running", 
                timestamp = DateTime.UtcNow,
                status = "healthy"
            }); // Returnera hälsokontroll som OK response
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
        {
            if (!ModelState.IsValid) // Kontrollera om modellvalidering är giltig
                return BadRequest(ModelState); // Returnera fel om validering misslyckas

            if (registerDto.Password != registerDto.ConfirmPassword) // Kontrollera om lösenord matchar
                return BadRequest("Passwords do not match"); // Returnera fel om lösenord inte matchar

            var existingUser = await _userManager.FindByEmailAsync(registerDto.Email); // Kontrollera om användare redan finns
            if (existingUser != null) // Kontrollera om användare redan existerar
                return BadRequest("User with this email already exists"); // Returnera fel om användare redan finns

            var user = new ApplicationUser
            {
                UserName = registerDto.Email,
                Email = registerDto.Email,
                FirstName = registerDto.FirstName,
                LastName = registerDto.LastName,
                Role = "Member",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsActive = true
            }; // Skapa ny användare med registreringsdata

            var result = await _userManager.CreateAsync(user, registerDto.Password); // Skapa användare i databasen
            if (!result.Succeeded) // Kontrollera om skapandet lyckades
                return BadRequest(result.Errors); // Returnera fel om skapandet misslyckades

            await _userManager.AddToRoleAsync(user, "Member"); // Lägg till användare i Member-roll

            return Ok(new
            {
                message = "User registered successfully",
                user = new
                {
                    user.Id,
                    user.Email,
                    user.FirstName,
                    user.LastName,
                    user.Role,
                    user.IsActive
                }
            }); // Returnera skapad användare
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
        {
            if (!ModelState.IsValid) // Kontrollera om modellvalidering är giltig
                return BadRequest(ModelState); // Returnera fel om validering misslyckas

            var user = await _userManager.FindByEmailAsync(loginDto.Email); // Hämta användare via e-post
            if (user == null) // Kontrollera om användare finns
                return BadRequest("Invalid email or password"); // Returnera fel om användare inte finns

            if (!user.IsActive) // Kontrollera om användare är aktiv
                return BadRequest("User account is deactivated"); // Returnera fel om användare är inaktiverad

            var result = await _signInManager.CheckPasswordSignInAsync(user, loginDto.Password, false); // Kontrollera lösenord
            if (!result.Succeeded) // Kontrollera om inloggning lyckades
                return BadRequest("Invalid email or password"); // Returnera fel om inloggning misslyckades

            var roles = await _userManager.GetRolesAsync(user); // Hämta användarroller

            var token = _jwtTokenManager.GenerateToken(user); // Generera JWT token

            return Ok(new
            {
                message = "Login successful",
                user = new
                {
                    user.Id,
                    user.Email,
                    user.FirstName,
                    user.LastName,
                    user.Role,
                    user.IsActive,
                    roles = roles.ToList()
                },
                token = token
            }); // Returnera inloggningsresultat med token
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            await _signInManager.SignOutAsync(); // Logga ut användare
            return Ok(new { message = "Logout successful" }); // Returnera lyckat utloggningsresultat
        }

        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var authHeader = Request.Headers["Authorization"].FirstOrDefault(); // Hämta Authorization header
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ")) // Kontrollera om token finns
                return Unauthorized("No valid token provided"); // Returnera unauthorized om token saknas

            var token = authHeader.Substring("Bearer ".Length); // Extrahera token från header
            var principal = _jwtTokenManager.GetPrincipalFromToken(token); // Validera token och hämta principal
            
            if (principal == null) // Kontrollera om token är giltig
                return Unauthorized("Invalid token"); // Returnera unauthorized om token är ogiltig

            var userId = principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value; // Hämta användar-ID från token
            if (string.IsNullOrEmpty(userId)) // Kontrollera om användar-ID finns
                return Unauthorized("Invalid token"); // Returnera unauthorized om användar-ID saknas

            var user = await _userManager.FindByIdAsync(userId); // Hämta användare via ID
            if (user == null) // Kontrollera om användare finns
                return NotFound("User not found"); // Returnera 404 om användare inte hittades

            if (!user.IsActive) // Kontrollera om användare är aktiv
                return BadRequest("User account is deactivated"); // Returnera fel om användare är inaktiverad

            var roles = await _userManager.GetRolesAsync(user); // Hämta användarroller

            return Ok(new
            {
                user.Id,
                user.Email,
                user.FirstName,
                user.LastName,
                user.Role,
                user.IsActive,
                user.CreatedAt,
                user.UpdatedAt,
                roles = roles.ToList()
            }); // Returnera användarprofil
        }

        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto updateProfileDto)
        {
            var authHeader = Request.Headers["Authorization"].FirstOrDefault(); // Hämta Authorization header
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ")) // Kontrollera om token finns
                return Unauthorized("No valid token provided"); // Returnera unauthorized om token saknas

            var token = authHeader.Substring("Bearer ".Length); // Extrahera token från header
            var principal = _jwtTokenManager.GetPrincipalFromToken(token); // Validera token och hämta principal
            
            if (principal == null) // Kontrollera om token är giltig
                return Unauthorized("Invalid token"); // Returnera unauthorized om token är ogiltig

            var userId = principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value; // Hämta användar-ID från token
            if (string.IsNullOrEmpty(userId)) // Kontrollera om användar-ID finns
                return Unauthorized("Invalid token"); // Returnera unauthorized om användar-ID saknas

            var user = await _userManager.FindByIdAsync(userId); // Hämta användare via ID
            if (user == null) // Kontrollera om användare finns
                return NotFound("User not found"); // Returnera 404 om användare inte hittades

            if (!user.IsActive) // Kontrollera om användare är aktiv
                return BadRequest("User account is deactivated"); // Returnera fel om användare är inaktiverad

            user.FirstName = updateProfileDto.FirstName; // Uppdatera förnamn
            user.LastName = updateProfileDto.LastName; // Uppdatera efternamn
            user.UpdatedAt = DateTime.UtcNow; // Uppdatera tidsstämpel

            var result = await _userManager.UpdateAsync(user); // Uppdatera användare i databasen
            if (!result.Succeeded) // Kontrollera om uppdateringen lyckades
                return BadRequest(result.Errors); // Returnera fel om uppdateringen misslyckades

            return Ok(new
            {
                message = "Profile updated successfully",
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
            }); // Returnera uppdaterad användarprofil
        }

        [HttpPost("refresh-token")]
        public IActionResult RefreshToken([FromBody] RefreshTokenDto refreshTokenDto)
        {
            if (string.IsNullOrEmpty(refreshTokenDto.Token)) // Kontrollera om token finns
                return BadRequest("Token is required"); // Returnera fel om token saknas

            var newToken = _jwtTokenManager.RefreshToken(refreshTokenDto.Token); // Förnya token
            if (newToken == null) // Kontrollera om token-förnyelse lyckades
                return BadRequest("Invalid token"); // Returnera fel om token är ogiltig

            return Ok(new
            {
                message = "Token refreshed successfully",
                token = newToken
            }); // Returnera ny token
        }
    }
}
