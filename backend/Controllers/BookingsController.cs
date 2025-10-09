using System.Security.Claims;
// Importerar Claims för användaridentifikation
using backend.Models;
// Importerar modeller för bokningar
using backend.Services;
// Importerar service-gränssnitt
using backend.Models.DTOs;
// Importerar Data Transfer Objects
using Microsoft.AspNetCore.Authorization;
// Importerar auktoriseringsfunktioner
using Microsoft.AspNetCore.Mvc;
// Importerar MVC-kontrollerfunktioner

namespace backend.Controllers
{
    [Route("api/[controller]")]
    // Definierar API-rutt för bokningskontrollern
    [ApiController]
    // Markerar som API-kontroller
    public class BookingsController : ControllerBase
    {
        private readonly IBookingService _service;
        // Privat fält för bokningsservice

        public BookingsController(IBookingService service)
        // Konstruktor som tar emot bokningsservice
        {
            _service = service;
            // Tilldelar service till privat fält
        }

        //Get all bookings
        // Hämta alla bokningar
        [Authorize(Roles = "Admin, Member")]
        // Auktorisering för Admin och Member roller
        [HttpGet]
        // HTTP GET-metod
        public async Task<ActionResult> GetAll()
        // Asynkron metod för att hämta alla bokningar
        {
            var bookings = await _service.GetAllAsync();
            // Hämtar alla bokningar från service
            return Ok(bookings);
            // Returnerar bokningar med OK-status
        }

        //Get a specific booking by id
        // Hämta specifik bokning efter ID
        [Authorize(Roles = "Admin, Member")]
        // Auktorisering för Admin och Member roller
        [HttpGet("{BookingId}")]
        // HTTP GET-metod med BookingId-parameter
        public async Task<ActionResult> GetById(int BookingId)
        // Asynkron metod för att hämta bokning efter ID
        {
            var result = await _service.GetByIdAsync(BookingId);
            // Hämtar bokning från service med angivet ID
            if (result == null)
            // Kontrollerar om bokning finns
            {
                return NotFound();
                // Returnerar NotFound om bokning inte finns
            }

            if (!User.IsInRole("Admin") && result.UserId != User.FindFirstValue(ClaimTypes.NameIdentifier))
            // Kontrollerar om användare är Admin eller äger bokningen
            {
                return Unauthorized("Bokningen tillhör en annan användare.");
                // Returnerar Unauthorized om användare inte äger bokningen
            }

            return Ok(result);
            // Returnerar bokning med OK-status
        }

        //Get bookings for the current user
        // Hämta bokningar för aktuell användare
        [Authorize(Roles = "Admin, Member")]
        // Auktorisering för Admin och Member roller
        [HttpGet("myBookings")]
        // HTTP GET-metod för användarens egna bokningar
        public async Task<ActionResult> GetMyBookings(bool includeExpiredBookings = false)
        // Asynkron metod för att hämta användarens bokningar
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            // Hämtar användar-ID från Claims
            if (string.IsNullOrEmpty(userId))
            // Kontrollerar om användar-ID finns
                return Unauthorized();
                // Returnerar Unauthorized om användar-ID saknas

            var result = await _service.GetMyBookingsAsync(userId, includeExpiredBookings);
            // Hämtar användarens bokningar från service
            return Ok(result);
            // Returnerar bokningar med OK-status
        }

        //Get bookings for a resource
        // Hämta bokningar för en resurs
        [Authorize(Roles = "Admin, Member")]
        // Auktorisering för Admin och Member roller
        [HttpGet("getByResource/{resourceId}")]
        // HTTP GET-metod för bokningar för specifik resurs
        public async Task<ActionResult> GetResourceBookings(int resourceId, bool includeExpiredBookings = false)
        // Asynkron metod för att hämta bokningar för en resurs
        {
            var result = await _service.GetResourceBookingsAsync(resourceId, includeExpiredBookings);
            // Hämtar bokningar för resurs från service
            return Ok(result);
            // Returnerar bokningar med OK-status
        }

        //Creates a new booking
        // Skapar en ny bokning
        [Authorize(Roles = "Admin, Member")]
        // Auktorisering för Admin och Member roller
        [HttpPost]
        // HTTP POST-metod för att skapa bokning
        public async Task<ActionResult> Create(BookingDTO dto)
        // Asynkron metod för att skapa ny bokning
        {
            if (dto == null)
            // Kontrollerar om DTO är null
                return BadRequest("Booking data is required.");
                // Returnerar BadRequest om data saknas

            if (!ModelState.IsValid)
            // Kontrollerar om modell är giltig
                return BadRequest(ModelState);
                // Returnerar BadRequest med modellfel

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            // Hämtar användar-ID från Claims
            if (string.IsNullOrEmpty(userId))
            // Kontrollerar om användar-ID finns
            {
                return Unauthorized("User not found or not logged in.");
                // Returnerar Unauthorized om användare inte är inloggad
            }

            var created = await _service.CreateAsync(userId, dto);
            // Skapar bokning via service
            return CreatedAtAction(nameof(GetById), new { BookingId = created.BookingId }, created);
            // Returnerar Created med länk till den skapade bokningen
        }

        //Updating an existing booking
        // Uppdaterar befintlig bokning
        [Authorize(Roles = "Admin")]
        // Auktorisering endast för Admin
        [HttpPut]
        // HTTP PUT-metod för att uppdatera bokning
        public async Task<IActionResult> Update([FromBody] Booking booking)
        // Asynkron metod för att uppdatera bokning
        {
            if (!ModelState.IsValid)
            // Kontrollerar om modell är giltig
                return BadRequest(ModelState);
                // Returnerar BadRequest med modellfel

            var updated = await _service.UpdateAsync(booking);
            // Uppdaterar bokning via service
            return updated == null ? NotFound() : Ok(updated);
            // Returnerar NotFound om bokning inte finns, annars OK med uppdaterad bokning
        }

    
        //Cancels a booking
        // Avbokar en bokning
        [Authorize(Roles = "Admin, Member")]
        // Auktorisering för Admin och Member roller
        [HttpPost("cancel/{bookingId}")]
        // HTTP POST-metod för att avboka bokning
        public async Task<ActionResult> CancelBooking(int bookingId)
        // Asynkron metod för att avboka bokning
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            // Hämtar användar-ID från Claims
            var isAdmin = User.IsInRole("Admin");
            // Kontrollerar om användare är Admin

            var booking = await _service.CancelBookingAsync(userId, isAdmin, bookingId);
            // Avbokar bokning via service
            if (booking == null) return NotFound("BookingNotFound");
            // Returnerar NotFound om bokning inte finns

            return Ok(booking);
            // Returnerar avbokad bokning med OK-status
        }

        //Deletes a booking permanently
        // Raderar en bokning permanent
        [Authorize(Roles = "Admin")]
        // Auktorisering endast för Admin
        [HttpPost("delete/{bookingId}")]
        // HTTP POST-metod för att radera bokning
        public async Task<ActionResult> Delete(int bookingId)
        // Asynkron metod för att radera bokning
        {
            var booking = await _service.DeleteAsync(bookingId);
            // Raderar bokning via service
            if (booking == null) return NotFound("BookingNotFound");
            // Returnerar NotFound om bokning inte finns

            return Ok(booking);
            // Returnerar raderad bokning med OK-status
        }
    }
    // Slut på BookingsController-klassen
}
// Slut på namespace