import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardList, Building2, BedDouble, CalendarDays,
  IndianRupee, Clock, CheckCircle2, XCircle, Inbox,
  Phone, Loader2, Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

interface BookingWithDetails {
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
  owner_phone: string | null;
}

const StatusBadge = ({ status }: { status: string }) => {
  const s = status.toLowerCase();
  if (s === "approved" || s === "contacted") {
    return (
      <Badge className="bg-[hsl(142,71%,45%)] text-[hsl(0,0%,100%)] gap-1.5 px-3 py-1">
        <CheckCircle2 className="h-3.5 w-3.5" /> Approved
      </Badge>
    );
  }
  if (s === "rejected") {
    return (
      <Badge className="bg-[hsl(0,84%,60%)] text-[hsl(0,0%,100%)] gap-1.5 px-3 py-1">
        <XCircle className="h-3.5 w-3.5" /> Rejected
      </Badge>
    );
  }
  return (
    <Badge className="bg-[hsl(45,93%,47%)] text-[hsl(0,0%,100%)] gap-1.5 px-3 py-1">
      <Clock className="h-3.5 w-3.5" /> Pending
    </Badge>
  );
};

const MyBookings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (bookingId: string) => {
    setDeletingId(bookingId);
    try {
      const { error } = await supabase.from("bookings").delete().eq("id", bookingId);
      if (error) throw error;
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      toast({ title: "Deleted", description: "Booking request deleted successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      // Verify student role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (roleData?.role !== "student") { navigate("/"); return; }

      setUserId(session.user.id);
      await fetchBookings(session.user.id);
    };
    init();
  }, [navigate]);

  const fetchBookings = async (uid: string) => {
    const { data, error } = await supabase
      .from("bookings")
      .select("id, hostel_id, room_id, bed_number, rent_per_bed, booking_date, move_in_date, status, notes")
      .eq("user_id", uid)
      .order("booking_date", { ascending: false });

    if (error || !data) { setBookings([]); setLoading(false); return; }

    const hostelIds = [...new Set(data.map((b) => b.hostel_id))];
    const roomIds = [...new Set(data.map((b) => b.room_id))];

    const [hostelsRes, roomsRes] = await Promise.all([
      supabase.from("hostels").select("id, name, owner_id").in("id", hostelIds),
      supabase.from("rooms").select("id, sharing_type, room_no").in("id", roomIds),
    ]);

    // Fetch owner phones for approved bookings
    const ownerIds = [...new Set((hostelsRes.data || []).map((h) => h.owner_id))];
    const { data: ownerProfiles } = ownerIds.length > 0
      ? await supabase.from("profiles").select("id, phone").in("id", ownerIds)
      : { data: [] };

    const hostelMap = Object.fromEntries((hostelsRes.data || []).map((h) => [h.id, { name: h.name, owner_id: h.owner_id }]));
    const roomMap = Object.fromEntries((roomsRes.data || []).map((r) => [r.id, { sharing_type: r.sharing_type, room_no: r.room_no }]));
    const ownerPhoneMap = Object.fromEntries((ownerProfiles || []).map((p) => [p.id, p.phone]));

    const enriched: BookingWithDetails[] = data.map((b) => {
      const hostel = hostelMap[b.hostel_id];
      return {
        ...b,
        hostel_name: hostel?.name || "Unknown Hostel",
        sharing_type: roomMap[b.room_id]?.sharing_type || "N/A",
        room_no: roomMap[b.room_id]?.room_no || "N/A",
        owner_phone: hostel ? ownerPhoneMap[hostel.owner_id] || null : null,
      };
    });

    setBookings(enriched);
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("student-bookings-page")
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

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-primary" />
              My Bookings
            </h1>
            <p className="text-muted-foreground mt-1">
              Track the status of all your hostel booking requests
            </p>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 shadow-soft">
                  <Skeleton className="h-5 w-48 mb-4" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </Card>
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <Card className="p-12 shadow-soft">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Inbox className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">No booking requests yet</p>
                <p className="text-sm mt-1 mb-6">Browse hostels and submit a booking request to get started.</p>
                <Button onClick={() => navigate("/search")} variant="hero">
                  Browse Hostels
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => {
                const isApproved = ["approved", "contacted"].includes(booking.status.toLowerCase());
                const isRejected = booking.status.toLowerCase() === "rejected";

                return (
                  <Card
                    key={booking.id}
                    className={`p-6 shadow-soft transition-all border-l-4 ${
                      isApproved
                        ? "border-l-[hsl(142,71%,45%)]"
                        : isRejected
                        ? "border-l-[hsl(0,84%,60%)]"
                        : "border-l-[hsl(45,93%,47%)]"
                    }`}
                  >
                    {/* Top row: hostel name + status */}
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <h3 className="font-semibold text-foreground text-base truncate">
                        {booking.hostel_name}
                      </h3>
                      <StatusBadge status={booking.status} />
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <InfoItem
                        icon={<BedDouble className="h-4 w-4 text-primary" />}
                        label="Room & Type"
                        value={`Room ${booking.room_no} · ${booking.sharing_type}`}
                      />
                      <InfoItem
                        icon={<Building2 className="h-4 w-4 text-primary" />}
                        label="Bed Number"
                        value={booking.bed_number ? `Bed #${booking.bed_number}` : "Not assigned"}
                      />
                      <InfoItem
                        icon={<IndianRupee className="h-4 w-4 text-primary" />}
                        label="Rent per Bed"
                        value={`₹${booking.rent_per_bed.toLocaleString("en-IN")}`}
                      />
                      <InfoItem
                        icon={<CalendarDays className="h-4 w-4 text-primary" />}
                        label="Move-in Date"
                        value={new Date(booking.move_in_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      />
                    </div>

                    {/* Booking date + owner contact */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Requested on {new Date(booking.booking_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        {isApproved && booking.owner_phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs"
                            onClick={() => window.open(`tel:${booking.owner_phone}`, "_self")}
                          >
                            <Phone className="h-3.5 w-3.5" />
                            Contact Owner
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0">
                              {deletingId === booking.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Booking Request?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove your booking request for {booking.hostel_name}. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(booking.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2.5">
    <div className="mt-0.5 shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  </div>
);

export default MyBookings;
