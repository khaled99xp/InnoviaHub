using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using backend.Models;
using backend.Models.AI;

namespace backend.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<ApplicationUser> AppUsers { get; set; }
        public DbSet<ResourceType> ResourceTypes { get; set; }
        public DbSet<Resource> Resources { get; set; }
        public DbSet<Booking> Bookings { get; set; }
        
        // AI Models
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<AIInsight> AIInsights { get; set; }
        public DbSet<ResourceRecommendation> ResourceRecommendations { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // To hinder double booking - prevent overlapping bookings
            modelBuilder.Entity<Booking>()
                .HasIndex(b => new { b.ResourceId, b.BookingDate, b.EndDate })
                .IsUnique();

            // Seed ResourceTypes
            modelBuilder.Entity<ResourceType>().HasData(
                new ResourceType { ResourceTypeId = 1, Name = "DropInDesk" },
                new ResourceType { ResourceTypeId = 2, Name = "MeetingRoom" },
                new ResourceType { ResourceTypeId = 3, Name = "VRset" },
                new ResourceType { ResourceTypeId = 4, Name = "AIserver" }
            );

            // Seed Resources
            var resources = new List<Resource>();


            // 15 Desks
            for (int i = 1; i <= 15; i++)
            {
                resources.Add(new Resource
                {
                    ResourceId = i,
                    ResourceTypeId = 1,
                    Name = $"Desk {i}",
                    IsBooked = false
                });
            }

            // 4 Meeting Rooms
            for (int i = 1; i <= 4; i++)
            {
                resources.Add(new Resource
                {
                    ResourceId = 100 + i,
                    ResourceTypeId = 2,
                    Name = $"Meeting Room {i}",
                    IsBooked = false
                });
            }

            // 4 VR Sets
            for (int i = 1; i <= 4; i++)
            {
                resources.Add(new Resource
                {
                    ResourceId = 200 + i,
                    ResourceTypeId = 3,
                    Name = $"VR Headset {i}",
                    IsBooked = false
                });
            }

            // 1 AI Server
            resources.Add(new Resource
            {
                ResourceId = 300,
                ResourceTypeId = 4,
                Name = "AI Server",
                IsBooked = false
            });

            modelBuilder.Entity<Resource>().HasData(resources);
        }
    }
}
