import type { Booking } from "@/types/booking";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo } from "react";

interface MyBookingCardProps {
  booking: Booking;
  onCancel: (bookingId: number) => void;
}

export default function MyBookingCard({
  booking,
  onCancel,
}: MyBookingCardProps) {
  //Timeslot label
  const timeslotLabel = useMemo(() => {
    return booking.timeslot === "FM" ? "Morning (08–12)" : "Afternoon (12–16)";
  }, [booking.timeslot]);

  //Updates when a booking changes
  useEffect(() => {}, [booking.bookingDate]);

  const badgeText = booking.isActive ? "My Booking" : "Cancelled";
  const badgeStyle = booking.isActive
    ? "bg-blue-100 text-blue-800"
    : "bg-gray-100 text-gray-800";

  const dateOnly = new Date(booking.bookingDate).toLocaleDateString("sv-SE", {
    timeZone: "Europe/Stockholm",
  });

  return (
    <div className="rounded-lg p-4 flex flex-col justify-between bg-white border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">{booking.resource.name}</h3>
        <span
          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${badgeStyle}`}
        >
          {badgeText}
        </span>
      </div>

      <p className="text-sm mb-1">
        {dateOnly} – {timeslotLabel}
      </p>

      {booking.isActive && (
        <Button
          onClick={() => onCancel(booking.bookingId)}
          className="mt-4 bg-red-600 text-white hover:bg-red-700"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
