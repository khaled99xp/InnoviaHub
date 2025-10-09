using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using backend.Services;
using backend.Models.DTOs.Resource;
using backend.Data;
using Microsoft.EntityFrameworkCore;


namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ResourcesController : ControllerBase
    {
        private readonly IResourceService _service; // Service för att hantera resursoperationer
        private readonly ApplicationDbContext _context; // Databas kontext för tillgänglighetskontroll

        public ResourcesController(IResourceService service, ApplicationDbContext context)
        {
            _service = service; // Tilldela service dependency
            _context = context; // Tilldela database context dependency
        }

        // GET: api/resources
        [HttpGet]
        [Authorize(Roles = "Admin,Member")] // Kräver Admin eller Member roll
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var resources = await _service.GetAllAsync(); // Hämta alla resurser från service
                return Ok(resources); // Returnera resurser som OK response
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Internal server error", message = ex.Message }); // Returnera server error vid exception
            }
        }

        // GET: api/resources/{id}
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Member")] // Kräver Admin eller Member roll
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var resource = await _service.GetByIdAsync(id); // Hämta specifik resurs från service
                return resource == null ? NotFound(new { error = "Resource not found" }) : Ok(resource); // Returnera 404 om inte hittad, annars OK med resurs
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Internal server error", message = ex.Message }); // Returnera server error vid exception
            }
        }

        // POST: api/resources
        [HttpPost]
        [Authorize(Roles = "Admin")] // Endast administratörer kan skapa resurser
        public async Task<ActionResult> Create([FromBody] ResourceReqDTO dto)
        {
            try
            {
                if (dto == null) // Validera att resursdata finns
                    return BadRequest(new { error = "Resource data is required." }); // Returnera bad request om data saknas
                if (!ModelState.IsValid) // Validera model state
                    return BadRequest(ModelState); // Returnera bad request om validering misslyckas

                var created = await _service.CreateAsync(dto); // Skapa ny resurs genom service
                return CreatedAtAction(nameof(GetById), new { id = created.ResourceId }, created); // Returnera created response med resurs
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Internal server error", message = ex.Message }); // Returnera server error vid exception
            }
        }

        // PUT: api/resources/{id}
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")] // Endast administratörer kan uppdatera resurser
        public async Task<IActionResult> Update(int id, [FromBody] ResourceDTO dto)
        {
            try
            {
                if (!ModelState.IsValid) // Validera model state
                    return BadRequest(ModelState); // Returnera bad request om validering misslyckas

                if (dto.Name != null && string.IsNullOrWhiteSpace(dto.Name)) // Validera att namn inte är tomt
                    return BadRequest(new { error = "Name cannot be empty." }); // Returnera bad request om namn är tomt

                var updated = await _service.UpdateAsync(id, dto); // Uppdatera resurs genom service
                return updated == null ? NotFound(new { error = "Resource not found" }) : Ok(updated); // Returnera 404 om inte hittad, annars OK med uppdaterad resurs
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Internal server error", message = ex.Message }); // Returnera server error vid exception
            }
        }

        // DELETE: api/resources/{id}
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")] // Endast administratörer kan ta bort resurser
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var deleted = await _service.DeleteAsync(id); // Ta bort resurs genom service
                return deleted ? NoContent() : NotFound(new { error = "Resource not found" }); // Returnera 204 om lyckad borttagning, annars 404
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Internal server error", message = ex.Message }); // Returnera server error vid exception
            }
        }

        // GET: api/resources/{resourceId}/availability
        [HttpGet("{resourceId}/availability")]
        [Authorize(Roles = "Admin,Member")] // Kräver Admin eller Member roll
        public async Task<IActionResult> CheckAvailability(int resourceId, [FromQuery] string date, [FromQuery] string timeslot)
        {
            try
            {
                if (!DateTime.TryParse(date, out var localDate)) // Validera datumformat
                    return BadRequest(new { message = "Invalid date format" }); // Returnera bad request om datumformat är ogiltigt

                if (timeslot != "FM" && timeslot != "EF" && timeslot != "Förmiddag" && timeslot != "Eftermiddag") // Validera tidsperiod
                    return BadRequest(new { message = "Invalid timeslot" }); // Returnera bad request om tidsperiod är ogiltig

                var normalizedTimeslot = timeslot switch // Normalisera tidsperiod till standardformat
                {
                    "Förmiddag" => "FM",
                    "Eftermiddag" => "EF",
                    _ => timeslot
                };

                var startLocal = normalizedTimeslot == "FM" ? localDate.Date.AddHours(8) : localDate.Date.AddHours(12); // Beräkna starttid baserat på FM/EF
                var endLocal = normalizedTimeslot == "FM" ? localDate.Date.AddHours(12) : localDate.Date.AddHours(16); // Beräkna sluttid baserat på FM/EF

                var startUtc = startLocal.ToUniversalTime(); // Konvertera starttid till UTC för databasjämförelse
                var endUtc = endLocal.ToUniversalTime(); // Konvertera sluttid till UTC för databasjämförelse

                var isBooked = await _context.Bookings.AnyAsync(b => // Kontrollera om tidsperioden redan är bokad
                    b.ResourceId == resourceId &&
                    b.IsActive &&
                    b.BookingDate == startUtc &&
                    b.EndDate == endUtc
                );

                return Ok(new { available = !isBooked, resourceId = resourceId, date = date, timeslot = normalizedTimeslot }); // Returnera tillgänglighetsstatus
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Internal server error", message = ex.Message }); // Returnera server error vid exception
            }
        }
    }

}
