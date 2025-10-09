import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "@/context/UserContext";
import type { Resource } from "@/types/resource";
import type { Booking } from "@/types/booking";
import { fetchResources } from "@/api/resourceApi";
import {
  fetchBookings,
  fetchMyBookings,
  cancelBooking,
} from "@/api/bookingApi";
import ResourceCard from "@/components/Resource/ResourceCard";
import CalendarComponent from "@/components/Calender/calenderComponent";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useSignalR } from "@/hooks/useSignalR";

//Builds a key form stockholm date, month year date
const dateKeySthlm = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = fmt.find((p) => p.type === "year")?.value ?? "";
  const m = fmt.find((p) => p.type === "month")?.value ?? "";
  const day = fmt.find((p) => p.type === "day")?.value ?? "";
  return `${y}-${m}-${day}`;
};

//Gets current hour in stockholm
const currentSthlmHour = () =>
  parseInt(
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Stockholm",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
    10
  );

//Gets todays year month date i stockholm
const todayKeySthlm = () => dateKeySthlm(new Date());

export default function BookingsPage() {
  const navigate = useNavigate();
  const { token } = useContext(UserContext);
  const [resources, setResources] = useState<Resource[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<"Morning" | "Afternoon" | null>(
    null
  );

  // Memoized refresh data function
  const refreshData = useCallback(async () => {
    if (!token) return;
    try {
      const [r, ab, mb] = await Promise.all([
        fetchResources(token),
        fetchBookings(token),
        fetchMyBookings(token),
      ]);
      setResources(r);
      setAllBookings(ab);
      setMyBookings(mb);
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  }, [token]);

  //Looking for booked slots, with help of stockholm date & time
  type DaySlots = { FM: boolean; EF: boolean };
  const slotMap = useMemo(() => {
    const map = new Map<string, DaySlots>();

    for (const b of allBookings) {
      if (!b.isActive) continue;

      // Convert booking start to a Stockholm day key
      const keyDate = dateKeySthlm(new Date(b.bookingDate));
      const key = `${b.resource.resourceId}__${keyDate}`;
      const entry = map.get(key) ?? { FM: false, EF: false };

      if (b.timeslot === "FM") entry.FM = true;
      if (b.timeslot === "EF") entry.EF = true;

      map.set(key, entry);
    }
    return map;
  }, [allBookings]);

  //Fetching resources & bookings
  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const [r, ab, mb] = await Promise.all([
          fetchResources(token),
          fetchBookings(token),
          fetchMyBookings(token),
        ]);
        setResources(r);
        setAllBookings(ab);
        setMyBookings(mb);
      } catch {
        toast.error("Could not fetch data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  // Manual refresh function for real-time updates
  const manualRefresh = useCallback(async () => {
    if (!token) return;
    try {
      await refreshData();
      toast.success("Data refreshed");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    }
  }, [token, refreshData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      refreshData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [token, refreshData]);

  // Use SignalR for real-time updates
  const { isConnected } = useSignalR({ token, onRefreshData: refreshData });

  //Cancels booking
  const handleCancel = async (bookingId: number) => {
    if (!token) return;
    try {
      await cancelBooking(token, bookingId);
      toast.success("Booking canceled!");

      const [r, ab, mb] = await Promise.all([
        fetchResources(token),
        fetchBookings(token),
        fetchMyBookings(token),
      ]);
      setResources(r);
      setAllBookings(ab);
      setMyBookings(mb);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Could not cancel booking");
    }
  };

  const desks = resources.filter((r) => r.resourceTypeName === "DropInDesk");
  const meetingRooms = resources.filter(
    (r) => r.resourceTypeName === "MeetingRoom"
  );
  const vrSets = resources.filter((r) => r.resourceTypeName === "VRset");
  const aiServers = resources.filter((r) => r.resourceTypeName === "AIserver");

  //Checks available slots for current day
  const currentSlots = useMemo(() => {
    if (!selectedResource || !selectedDateKey) return null;

    const k = `${selectedResource.resourceId}__${selectedDateKey}`;
    const s = slotMap.get(k) ?? { FM: false, EF: false };

    const today = todayKeySthlm();
    const hour = currentSthlmHour();

    let fmDisabled = s.FM;
    let efDisabled = s.EF;

    if (selectedDateKey === today) {
      fmDisabled = fmDisabled || hour >= 12;
      efDisabled = efDisabled || hour >= 16;
    }

    return { ...s, fmDisabled, efDisabled };
  }, [selectedResource, selectedDateKey, slotMap]);

  if (loading) return <p className="text-gray-600">Loading resources...</p>;

  return (
    <div className="p-6 space-y-12">
      {/* Status Bar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1 text-green-600 animate-pulse">
              <Wifi className="w-4 h-4" />
              <span className="text-sm">Real-time connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-600">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm">Real-time disconnected</span>
            </div>
          )}
        </div>

        <Button
          onClick={manualRefresh}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Data
        </Button>
      </div>

      {[
        { title: "Desks", list: desks },
        { title: "Meeting Rooms", list: meetingRooms },
        { title: "VR Headsets", list: vrSets },
        { title: "AI Server", list: aiServers },
      ].map(
        ({ title, list }) =>
          list.length > 0 && (
            <div key={title}>
              <h3 className="text-2xl font-bold mb-4 text-center">{title}</h3>
              <div
                className="grid gap-6"
                style={{
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  maxWidth: "1200px",
                  margin: "0 auto",
                }}
              >
                {list.map((r) => (
                  <div
                    key={r.resourceId}
                    className="bg-white rounded-xl p-6 shadow-sm"
                  >
                    <ResourceCard
                      resource={r}
                      allBookings={allBookings}
                      myBookings={myBookings}
                      onOpenBooking={async (res) => {
                        setSelectedResource(res);
                        setSelectedDateKey(null);
                        setTimeOfDay(null);

                        if (token) {
                          const [ab, mb] = await Promise.all([
                            fetchBookings(token),
                            fetchMyBookings(token),
                          ]);
                          setAllBookings(ab);
                          setMyBookings(mb);
                        }
                      }}
                      onCancel={handleCancel}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
      )}

      {selectedResource && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-6 border shadow-xl">
            <h2 className="text-xl font-bold text-center">
              Booking: {selectedResource.name}
            </h2>

            <CalendarComponent
              selectedDateKey={selectedDateKey}
              setSelectedDateKey={setSelectedDateKey}
              slotMap={slotMap}
              selectedResourceId={selectedResource.resourceId}
              dateKey={dateKeySthlm}
            />

            {selectedDateKey && currentSlots && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Choose time
                </label>
                <select
                  className="border rounded-md p-2 w-full"
                  value={timeOfDay ?? ""}
                  onChange={(e) =>
                    setTimeOfDay(e.target.value as "Morning" | "Afternoon")
                  }
                >
                  <option value="">--Select Time--</option>
                  <option value="Morning" disabled={currentSlots.fmDisabled}>
                    Morning (08–12) {currentSlots.FM ? " - already booked" : ""}
                  </option>
                  <option value="Afternoon" disabled={currentSlots.efDisabled}>
                    Afternoon (12–16){" "}
                    {currentSlots.EF ? " - already booked" : ""}
                  </option>
                </select>
              </div>
            )}

            <div className="flex justify-between">
              <Button
                onClick={() => {
                  if (!selectedDateKey) {
                    toast.error("You have to choose a date!");
                    return;
                  }
                  if (!timeOfDay) {
                    toast.error("Please choose a time!");
                    return;
                  }

                  // Navigate to payment page with booking details
                  const bookingDetails = {
                    resourceId: selectedResource.resourceId,
                    resourceName: selectedResource.name,
                    resourceType:
                      selectedResource.resourceTypeName || "Unknown",
                    date: selectedDateKey,
                    timeSlot:
                      timeOfDay === "Morning" ? "Förmiddag" : "Eftermiddag",
                    numberOfPeople: 1, // Default, can be made dynamic
                    price: 150, // Default price, can be made dynamic based on resource
                  };

                  navigate("/payment", { state: { bookingDetails } });
                }}
              >
                Confirm Booking
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedResource(null);
                  setSelectedDateKey(null);
                  setTimeOfDay(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
