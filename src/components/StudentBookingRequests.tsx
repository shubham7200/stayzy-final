import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardList, Building2, BedDouble, CalendarDays,
  IndianRupee, Clock, CheckCircle2, XCircle, Inbox
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BookingWithHostel {
  id: string;
  hostel_id: string;
  room_id: string;
  bed_number: number | null;
  rent_per_bed: number;
  booking_date: string;
  move_in_date: string;
  status: string;
  notes: string | null;
  hostel_name: string;
  sharing_type: string;
  room_no: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  switch (status.toLowerCase()) {
    case "contacted":
      return (
        <Badge className="bg-[hsl(160,60%,45%)] text-[hsl(0,0%,100%)] gap-1">
          <CheckCircle2 className="h-3 w-3" /> Contacted
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-destructive text-destructive-foreground gap-1">
          <XCircle className="h-3 w-3" /> Rejected
        </Badge>
      );
    default:
      return (
        <Badge className="bg-[hsl(38,92%,50%)] text-[hsl(0,0%,100%)] gap-1">
          <Clock className="h-3 w-3" /> Pending
        </Badge>
      );
  }
};

const StudentBookingRequests = ({ userId }: { userId: string }) => {
  const [bookings, setBookings] = useState<BookingWithHostel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("id, hostel_id, room_id, bed_number, rent_per_bed, booking_date, move_in_date, status, notes")
      .eq("user_id", userId)
      .order("booking_date", { ascending: false });

    if (error || !data) {
      setBookings([]);
      setLoading(false);
      return;
    }

    // Fetch hostel names and room info
    const hostelIds = [...new Set(data.map((b) => b.hostel_id))];
    const roomIds = [...new Set(data.map((b) => b.room_id))];

    const [hostelsRes, roomsRes] = await Promise.all([
      supabase.from("hostels").select("id, name").in("id", hostelIds),
      supabase.from("rooms").select("id, sharing_type, room_no").in("id", roomIds),
    ]);

    const hostelMap = Object.fromEntries((hostelsRes.data || []).map((h) => [h.id, h.name]));
    const roomMap = Object.fromEntries((roomsRes.data || []).map((r) => [r.id, { sharing_type: r.sharing_type, room_no: r.room_no }]));

    const enriched: BookingWithHostel[] = data.map((b) => ({
      ...b,
      hostel_name: hostelMap[b.hostel_id] || "Unknown Hostel",
      sharing_type: roomMap[b.room_id]?.sharing_type || "N/A",
      room_no: roomMap[b.room_id]?.room_no || "N/A",
    }));

    setBookings(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();

    // Real-time subscription for status changes
    const channel = supabase
      .channel("student-bookings")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `user_id=eq.${userId}` },
        (payload) => {
          setBookings((prev) =>
            prev.map((b) =>
              b.id === payload.new.id ? { ...b, status: (payload.new as any).status } : b
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (loading) {
    return (
      <Card className="p-6 shadow-soft space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-soft">
      <h3 className="font-semibold text-foreground flex items-center gap-2 mb-1">
        <ClipboardList className="h-4 w-4 text-primary" />
        My Booking Requests
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Track the status of your hostel booking requests
      </p>
      <Separator className="mb-5" />

      {bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Inbox className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No booking requests yet</p>
          <p className="text-xs mt-1">Browse hostels and submit a booking request to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="rounded-lg border bg-card p-4 space-y-3 hover-lift"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-sm text-foreground truncate">
                    {booking.hostel_name}
                  </span>
                </div>
                <StatusBadge status={booking.status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <BedDouble className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Room {booking.room_no} · {booking.sharing_type}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <IndianRupee className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>₹{booking.rent_per_bed}/bed</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Move-in: {new Date(booking.move_in_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{new Date(booking.booking_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default StudentBookingRequests;
