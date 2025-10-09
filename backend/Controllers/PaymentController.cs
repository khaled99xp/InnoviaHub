using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using backend.Services;
using backend.DTOs.AI;
using backend.Models.DTOs;
using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Kräver autentisering för alla endpoints
    public class PaymentController : ControllerBase
    {
        private readonly IBookingService _bookingService; // Service för att hantera bokningar
        private readonly ILogger<PaymentController> _logger; // Logger för att spåra aktivitet och fel
        private readonly ApplicationDbContext _context; // Databas kontext för användaruppslag

        public PaymentController(IBookingService bookingService, ILogger<PaymentController> logger, ApplicationDbContext context)
        {
            _bookingService = bookingService; // Tilldela booking service dependency
            _logger = logger; // Tilldela logger dependency
            _context = context; // Tilldela database context dependency
        }

        [HttpPost("process")]
        public async Task<IActionResult> ProcessPayment([FromBody] PaymentRequestDto request)
        {
            try
            {
                _logger.LogInformation("Payment process request received"); // Logga att betalningsrequest mottagits
                
                if (request == null || request.ResourceId <= 0 || string.IsNullOrEmpty(request.BookingDate)) // Validera betalningsrequest
                {
                    _logger.LogWarning("Invalid payment request: ResourceId={ResourceId}, BookingDate={BookingDate}", 
                        request?.ResourceId, request?.BookingDate); // Logga ogiltig betalningsrequest
                    return BadRequest(new { message = "Invalid payment request" }); // Returnera bad request om validering misslyckas
                }

                await Task.Delay(2000); // Simulera betalningsgateway fördröjning

                var timeslot = request.Timeslot.ToLower() switch // Konvertera svenska tidsperioder till engelsk format
                {
                    "förmiddag" or "morning" => "FM",
                    "eftermiddag" or "afternoon" => "EF",
                    _ => request.Timeslot
                };

                var bookingDto = new BookingDTO // Skapa bokning efter lyckad betalning
                {
                    ResourceId = request.ResourceId,
                    BookingDate = request.BookingDate,
                    Timeslot = timeslot
                };

                _logger.LogInformation("JWT Claims: {Claims}", string.Join(", ", User.Claims.Select(c => $"{c.Type}={c.Value}"))); // Logga JWT claims för debugging
                
                var userEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value; // Hämta användare-post från JWT token med korrekt claim-typ
                
                _logger.LogInformation("Email from ClaimTypes.Email: {Email}", userEmail); // Logga e-post från token
                
                if (string.IsNullOrEmpty(userEmail)) // Om ingen e-post hittas, prova alternativa tillvägagångssätt
                {
                    _logger.LogWarning("No email found in ClaimTypes.Email, trying alternative approaches"); // Logga att alternativa tillvägagångssätt används
                    
                    var tokenUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value; // Försök att hämta användar-ID direkt från JWT token
                    
                    _logger.LogInformation("User ID from token: {UserId}", tokenUserId); // Logga användar-ID från token
                    
                    if (!string.IsNullOrEmpty(tokenUserId))
                    {
                        var dbUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == tokenUserId); // Försök att hitta användare efter ID direkt
                        if (dbUser != null)
                        {
                            userEmail = dbUser.Email; // Tilldela e-post från databas
                            _logger.LogInformation("Found user by ID: {Email}", userEmail); // Logga att användare hittades via ID
                        }
                    }
                }
                
                _logger.LogInformation("Final user email: {Email}", userEmail); // Logga slutlig e-post
                
                if (string.IsNullOrEmpty(userEmail)) // Kontrollera om e-post finns
                {
                    _logger.LogWarning("User email not found in token claims"); // Logga att e-post inte hittades
                    return BadRequest(new { 
                        success = false, 
                        message = "User authentication failed - User email not found in token" 
                    }); // Returnera bad request om e-post saknas
                }
                
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail); // Hitta det faktiska användar-ID från databasen med e-post
                if (user == null) // Kontrollera om användare finns i databas
                {
                    _logger.LogWarning("User not found in database for email: {Email}", userEmail); // Logga att användare inte hittades
                    return BadRequest(new { 
                        success = false, 
                        message = "User not found in database" 
                    }); // Returnera bad request om användare inte finns
                }
                
                var userId = user.Id; // Tilldela användar-ID
                _logger.LogInformation("Found User ID: {UserId} for email: {Email}", userId, userEmail); // Logga användar-ID och e-post
                
                try
                {
                    _logger.LogInformation("Creating booking for user {UserId}, resource {ResourceId}, date {Date}, timeslot {Timeslot}", 
                        userId, bookingDto.ResourceId, bookingDto.BookingDate, bookingDto.Timeslot); // Logga bokningsdetaljer
                    
                    if (bookingDto.ResourceId <= 0) // Validera bokningsdata innan skapande
                    {
                        throw new Exception("Invalid ResourceId"); // Kasta exception om ResourceId är ogiltigt
                    }
                    
                    if (string.IsNullOrEmpty(bookingDto.BookingDate)) // Kontrollera att bokningsdatum finns
                    {
                        throw new Exception("BookingDate is required"); // Kasta exception om bokningsdatum saknas
                    }
                    
                    if (string.IsNullOrEmpty(bookingDto.Timeslot)) // Kontrollera att tidsperiod finns
                    {
                        throw new Exception("Timeslot is required"); // Kasta exception om tidsperiod saknas
                    }
                    
                    var booking = await _bookingService.CreateAsync(userId, bookingDto); // Skapa bokning genom booking service
                    _logger.LogInformation("Payment processed successfully for booking {BookingId}", booking.BookingId); // Logga lyckad betalning
                    return Ok(new { 
                        success = true, 
                        message = "Payment processed successfully",
                        bookingId = booking.BookingId
                    }); // Returnera OK med boknings-ID
                }
                catch (Exception bookingEx)
                {
                    _logger.LogError(bookingEx, "Booking creation failed: {Error}", bookingEx.Message); // Logga bokningsfel
                    return BadRequest(new { 
                        success = false, 
                        message = $"Booking creation failed: {bookingEx.Message}" 
                    }); // Returnera bad request med felmeddelande
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing payment"); // Logga betalningsfel
                return StatusCode(500, new { 
                    success = false, 
                    message = "Internal server error during payment processing" 
                }); // Returnera server error
            }
        }

        [HttpGet("calculate-price")]
        public IActionResult CalculatePrice([FromQuery] int resourceId, [FromQuery] string timeslot)
        {
            try
            {
                var basePrice = 100; // Grundpris
                var timeslotMultiplier = timeslot.ToLower() switch // Beräkna pris baserat på resurs och tidsperiod
                {
                    "förmiddag" or "morning" => 1.0,
                    "eftermiddag" or "afternoon" => 1.2,
                    "kväll" or "evening" => 1.5,
                    "heldag" or "fullday" => 2.0,
                    _ => 1.0
                };

                var resourceMultiplier = resourceId switch // Beräkna resursmultiplikator
                {
                    1 => 1.0, // Mötesrum 1
                    2 => 1.0, // Mötesrum 2
                    3 => 1.5, // Mötesrum 3
                    4 => 2.0, // Mötesrum 4
                    5 => 0.8, // Skrivbord
                    6 => 1.2, // VR Headset
                    7 => 1.8, // AI Server
                    _ => 1.0
                };

                var totalPrice = (int)(basePrice * timeslotMultiplier * resourceMultiplier); // Beräkna totalt pris

                return Ok(new { 
                    price = totalPrice,
                    basePrice = basePrice,
                    timeslotMultiplier = timeslotMultiplier,
                    resourceMultiplier = resourceMultiplier
                }); // Returnera pris med detaljer
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating price"); // Logga priskalkylfel
                return StatusCode(500, new { message = "Error calculating price" }); // Returnera server error
            }
        }
    }

    public class PaymentRequestDto
    {
        public int ResourceId { get; set; } // Resurs-ID som ska bokas
        public string BookingDate { get; set; } = ""; // Bokningsdatum
        public string Timeslot { get; set; } = ""; // Tidsperiod för bokning
        public string PaymentMethod { get; set; } = ""; // Betalningsmetod
        public string CardNumber { get; set; } = ""; // Kortnummer
        public string ExpiryDate { get; set; } = ""; // Utgångsdatum
        public string CVV { get; set; } = ""; // CVV-kod
        public string CardholderName { get; set; } = ""; // Korthållarens namn
    }
}
