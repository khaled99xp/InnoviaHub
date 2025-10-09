using System;
using Microsoft.AspNetCore.SignalR;

namespace backend.Hubs;

public class BookingHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync(); // Anropa basklassens OnConnectedAsync för standardhantering
        Console.WriteLine($"Client connected: {Context.ConnectionId}"); // Logga anslutning för debugging
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception); // Anropa basklassens OnDisconnectedAsync för standardhantering
        Console.WriteLine($"Client disconnected: {Context.ConnectionId}"); // Logga frånkoppling för debugging
    }
}
