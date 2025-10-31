using backend.Data;
using backend.Hubs;
using backend.Mapping;
using backend.Middleware;
using backend.Models;
using backend.Repositories;
using backend.Services;
using backend.Utils;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

builder.Configuration
    .AddEnvironmentVariables();

// Get configuration values (but don't validate until app is built - to allow OpenAPI generation during build)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"];

// Only log if we have values (don't throw during build time)
if (!string.IsNullOrEmpty(connectionString))
{
    var connectionStringForLog = connectionString.Length > 20 
        ? connectionString.Substring(0, 20) + "..." 
        : connectionString;
    Console.WriteLine($"[Config] ConnectionString exists: true");
    Console.WriteLine($"[Config] ConnectionString starts with: {connectionStringForLog}");
}
else
{
    Console.WriteLine($"[Config] ConnectionString: NOT CONFIGURED (will be validated at runtime)");
}

Console.WriteLine($"[Config] JWT Issuer: {jwtIssuer ?? "NULL"}");
Console.WriteLine($"[Config] JWT SecretKey length: {jwtSecretKey?.Length ?? 0}");

// Note: Configuration validation moved to after app.Build() to allow OpenAPI document generation during build

// Add services to the container.
builder.Services.AddScoped<IResourceRepository, ResourceRepository>();
builder.Services.AddScoped<IResourceService, ResourceService>();
builder.Services.AddScoped<IBookingRepository, BookingRepository>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IPromptService, PromptService>();
builder.Services.AddScoped<IAIService, AIService>();

// Add HTTP Client for OpenAI
builder.Services.AddHttpClient<IAIService, AIService>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddEndpointsApiExplorer();

// Add Entity Framework
// Only configure if connection string is available (skip during OpenAPI generation)
if (!string.IsNullOrEmpty(connectionString))
{
    // Log connection string info (hide password)
    var connectionStringForLog = connectionString;
    if (connectionString.Contains("Password="))
    {
        var passwordIndex = connectionString.IndexOf("Password=", StringComparison.OrdinalIgnoreCase);
        if (passwordIndex >= 0)
        {
            var afterPassword = connectionString.IndexOf(";", passwordIndex);
            if (afterPassword > passwordIndex)
            {
                connectionStringForLog = connectionString.Substring(0, passwordIndex + 9) + "***" + 
                                        (afterPassword < connectionString.Length ? connectionString.Substring(afterPassword) : "");
            }
        }
    }
    Console.WriteLine($"[EF] Connection String: {connectionStringForLog}");

    builder.Services.AddDbContext<ApplicationDbContext>(options =>
    {
        try
        {
            options.UseMySql(connectionString, 
                new MySqlServerVersion(new Version(8, 0, 33)),
                mysqlOptions =>
                {
                    mysqlOptions.EnableRetryOnFailure(
                        maxRetryCount: 3,
                        maxRetryDelay: TimeSpan.FromSeconds(5),
                        errorNumbersToAdd: null);
                });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[EF] Error configuring MySQL: {ex.Message}");
            throw;
        }
    });
}
else
{
    // Add a dummy DbContext configuration for OpenAPI generation (won't be used at runtime)
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
    {
        // This will be validated and configured properly after app.Build()
    });
    Console.WriteLine($"[EF] Connection String not available (likely during build) - will be validated at runtime");
}

// Add Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

// Add AutoMapper
builder.Services.AddAutoMapper(cfg => { }, typeof(ResourceMappingProfile));

// Add JWT Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SecretKey"] ?? "")),
        ClockSkew = TimeSpan.Zero
    };
});

// Cors implementation (configurable via configuration/env)
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        var configuredOrigins = builder.Configuration["Cors:AllowedOrigins"];

        string[] origins;
        if (!string.IsNullOrWhiteSpace(configuredOrigins))
            origins = configuredOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        else if (builder.Environment.IsDevelopment())
            origins = new[] { "http://localhost:5173", "http://localhost:3000" };
        else
            origins = Array.Empty<string>();

        if (origins.Length > 0)
            policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
        else
            policy.AllowAnyHeader().AllowAnyMethod();
    });
});

// Add Authorization
builder.Services.AddAuthorization();

// Add SignalR

// If connection string is provided in Azure use Azure SignalR Service.
// Otherwise use the normal in-process SignalR (so local dev keeps working).
var azureSignalRConnection = builder.Configuration["Azure:SignalR:ConnectionString"];

if (!string.IsNullOrEmpty(azureSignalRConnection))
{
    // You can pass the connection string explicitly or let the SDK read the env var.
    builder.Services.AddSignalR()
           .AddAzureSignalR(options => options.ConnectionString = azureSignalRConnection);
}
else
{
    builder.Services.AddSignalR(options =>
    {
        options.EnableDetailedErrors = builder.Environment.IsDevelopment();
        options.KeepAliveInterval = TimeSpan.FromSeconds(15);
        options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
        options.HandshakeTimeout = TimeSpan.FromSeconds(15);
    });
}

// Add JWT Token Manager
builder.Services.AddScoped<IJwtTokenManager, JwtTokenManager>();

var app = builder.Build();

// Validate required configuration NOW (after app is built, but before running migrations)
var runtimeConnectionString = app.Configuration.GetConnectionString("DefaultConnection");
var runtimeJwtSecret = app.Configuration["Jwt:SecretKey"];

if (string.IsNullOrEmpty(runtimeConnectionString))
{
    throw new InvalidOperationException(
        "ConnectionString 'DefaultConnection' is not configured. " +
        "Please set ConnectionStrings__DefaultConnection in appsettings.Development.json for local development, " +
        "or as an environment variable in production.");
}

if (string.IsNullOrEmpty(runtimeJwtSecret))
{
    throw new InvalidOperationException(
        "JWT SecretKey is not configured. " +
        "Please set Jwt__SecretKey in appsettings.Development.json for local development, " +
        "or as an environment variable in production.");
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

// Apply EF Core migrations automatically on startup (Production-safe)
try
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.MigrateAsync();
    }
    Console.WriteLine("[EF] Database migrations applied successfully.");
}
catch (Exception ex)
{
    Console.WriteLine($"[EF] Migration error: {ex.Message}");
    throw;
}


//Seed default roles and users
if (!app.Environment.IsEnvironment("CI"))
{
    using (var scope = app.Services.CreateScope())
    {
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        await DbSeeder.SeedRolesAndUsersAsync(roleManager, userManager);
    }
}


// Add middleware
app.UseMiddleware<ErrorHandlingMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();

app.UseCors("FrontendPolicy");

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

// Map SignalR Hub
app.MapHub<BookingHub>("/bookingHub");

app.UseStaticFiles();
app.MapControllers().RequireCors("FrontendPolicy");
app.Run();