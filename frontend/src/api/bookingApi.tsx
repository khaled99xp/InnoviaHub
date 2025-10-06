import type { Booking, BookingDTO } from "@/types/booking";
import { API_BASE_URL } from "@/utils/constants";

// Get all bookings for admin/overview
export async function fetchBookings(token: string): Promise<Booking[]> {
  const res = await fetch(`${API_BASE_URL}/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Couldnt get bookings");
  return await res.json();
}

// Get all bookings for logged in user
export async function fetchMyBookings(token: string): Promise<Booking[]> {
  const res = await fetch(`${API_BASE_URL}/bookings/myBookings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Couldnt get my bookings");
  return await res.json();
}

//Creates a booking for a resource
export async function createBooking(token: string, booking: BookingDTO) {
  const res = await fetch(`${API_BASE_URL}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(booking),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Couldnt create booking");
  }

  return res.json();
}

// Cancels a booking
export async function cancelBooking(token: string, bookingId: number) {
  const res = await fetch(`${API_BASE_URL}/bookings/cancel/${bookingId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Couldnt cancel booking");
}

//Deletes a booking
export async function deleteBooking(token: string, bookingId: number) {
  const res = await fetch(`${API_BASE_URL}/bookings/delete/${bookingId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Couldnt delete bookings");
}
