import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Building2, Clock, CheckCircle2, Bell, Phone, User, Home, Bed, IndianRupee, Calendar, Eye, PhoneCall, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Hostel {
  id: string;
  name: string;
  city: string;
  price_per_month: number;
  available_rooms: number;
  rating: number;
  approved: boolean;
}

interface BookingRequest {
  id: string;
  booking_date: string;
  move_in_date: string;
  status: string;
  notes: string | null;
  bed_number: number | null;
  rent_per_bed: number;
  created_at: string;
  user_id: string;
  hostel_id: string;
  room_id: string;
  // Joined data
  student_name: string;
  student_phone: string;
  hostel_name: string;
  room_no: string;
  sharing_type: string;
}

const ManageHostels = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState("hostels");

  useEffect(() => {
    checkOwnerAndLoadHostels();
  }, [navigate]);

  useEffect(() => {
    if (activeTab === "requests") {
      loadBookingRequests();
    }
  }, [activeTab]);

  const checkOwnerAndLoadHostels = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (roleData?.role !== "owner") {
        toast({
          title: "Access Denied",
          description: "You must be a hostel owner to access this page.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      const { data: hostelsData, error } = await supabase
        .from("hostels")
        .select("id, name, city, price_per_month, available_rooms, rating, approved")
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHostels(hostelsData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBookingRequests = async () => {
    setLoadingBookings(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // First get the owner's hostels
      const { data: ownerHostels } = await supabase
        .from("hostels")
        .select("id, name")
        .eq("owner_id", session.user.id);

      if (!ownerHostels || ownerHostels.length === 0) {
        setBookingRequests([]);
        return;
      }

      const hostelIds = ownerHostels.map(h => h.id);
      const hostelMap = new Map(ownerHostels.map(h => [h.id, h.name]));

      // Get bookings for owner's hostels
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("*")
        .in("hostel_id", hostelIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich with student profiles and room details
      const enrichedBookings = await Promise.all(
        (bookings || []).map(async (booking) => {
          // Get student profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("id", booking.user_id)
            .maybeSingle();

          // Get room details
          const { data: room } = await supabase
            .from("rooms")
            .select("room_no, sharing_type")
            .eq("id", booking.room_id)
            .maybeSingle();

          // Extract phone from notes if available (format: "Mobile: XXXXXXXXXX")
          let studentPhone = profile?.phone || "";
          if (booking.notes && booking.notes.startsWith("Mobile:")) {
            studentPhone = booking.notes.replace("Mobile:", "").trim();
          }

          return {
            ...booking,
            student_name: profile?.full_name || "Unknown",
            student_phone: studentPhone,
            hostel_name: hostelMap.get(booking.hostel_id) || "Unknown",
            room_no: room?.room_no || "Unknown",
            sharing_type: room?.sharing_type || "Unknown",
          };
        })
      );

      setBookingRequests(enrichedBookings);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load booking requests",
        variant: "destructive",
      });
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", bookingId);

      if (error) throw error;

      // Update local state
      setBookingRequests(prev =>
        prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b)
      );

      if (selectedBooking?.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, status: newStatus });
      }

      toast({
        title: "Status Updated",
        description: `Booking marked as ${newStatus === "confirmed" ? "Contacted" : "Rejected"}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this hostel?")) return;

    try {
      const { error } = await supabase.from("hostels").delete().eq("id", id);

      if (error) throw error;

      setHostels(hostels.filter((h) => h.id !== id));
      toast({
        title: "Success",
        description: "Hostel deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase.from("bookings").delete().eq("id", bookingId);
      if (error) throw error;
      setBookingRequests((prev) => prev.filter((b) => b.id !== bookingId));
      if (selectedBooking?.id === bookingId) setSelectedBooking(null);
      toast({ title: "Deleted", description: "Booking request deleted successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Pending</Badge>;
      case "confirmed":
        return <Badge variant="default" className="bg-green-600">Contacted</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = bookingRequests.filter(b => b.status === "pending").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Owner Dashboard</h1>
          <Button variant="hero" onClick={() => navigate("/add-hostel")} className="w-full sm:w-auto">
            <Plus className="h-5 w-5" />
            Add New Hostel
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 w-full sm:w-auto">
            <TabsTrigger value="hostels" className="gap-2 flex-1 sm:flex-initial">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">My </span>Hostels
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2 relative flex-1 sm:flex-initial">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Booking </span>Requests
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hostels">
            {hostels.length === 0 ? (
              <Card className="p-12 text-center">
                <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-semibold mb-2">No Hostels Yet</h2>
                <p className="text-muted-foreground mb-6">
                  Start by adding your first hostel listing
                </p>
                <Button variant="hero" onClick={() => navigate("/add-hostel")}>
                  <Plus className="h-5 w-5" />
                  Add Your First Hostel
                </Button>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {hostels.map((hostel) => (
                  <Card key={hostel.id} className="p-6">
                    {/* Approval Status Badge */}
                    <div className="mb-3">
                      {hostel.approved ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Approved by Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                          <Clock className="h-3 w-3 mr-1" />
                          Waiting for Admin Verification
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{hostel.name}</h3>
                        <p className="text-sm text-muted-foreground">{hostel.city}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-semibold">₹{hostel.price_per_month}/month</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Available Rooms:</span>
                        <span className="font-semibold">{hostel.available_rooms}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Rating:</span>
                        <span className="font-semibold">{hostel.rating}/5</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/edit-hostel/${hostel.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(hostel.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests">
            {loadingBookings ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : bookingRequests.length === 0 ? (
              <Card className="p-12 text-center">
                <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-semibold mb-2">No Booking Requests</h2>
                <p className="text-muted-foreground">
                  When students request to book your hostels, they will appear here.
                </p>
              </Card>
            ) : (
              <Card className="overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Hostel</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Bed</TableHead>
                      <TableHead>Rent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookingRequests.map((booking) => (
                      <TableRow key={booking.id} className={booking.status === "pending" ? "bg-amber-50" : ""}>
                        <TableCell className="font-medium">{booking.student_name}</TableCell>
                        <TableCell>{booking.hostel_name}</TableCell>
                        <TableCell>{booking.room_no} ({booking.sharing_type})</TableCell>
                        <TableCell>Bed #{booking.bed_number || "N/A"}</TableCell>
                        <TableCell>₹{booking.rent_per_bed}</TableCell>
                        <TableCell>{getStatusBadge(booking.status)}</TableCell>
                        <TableCell>{new Date(booking.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedBooking(booking)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Booking Request?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove this booking request from {booking.student_name} for {booking.hostel_name}. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteBooking(booking.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Booking Details Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Booking Request Details</DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex justify-center">
                {getStatusBadge(selectedBooking.status)}
              </div>

              {/* Student Details */}
              <Card className="p-4 space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Student Information</h4>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{selectedBooking.student_name}</p>
                    <p className="text-sm text-muted-foreground">Student Name</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{selectedBooking.student_phone || "Not provided"}</p>
                    <p className="text-sm text-muted-foreground">Phone Number</p>
                  </div>
                </div>
              </Card>

              {/* Booking Details */}
              <Card className="p-4 space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Booking Details</h4>
                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{selectedBooking.hostel_name}</p>
                    <p className="text-sm text-muted-foreground">Hostel Name</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Room {selectedBooking.room_no} ({selectedBooking.sharing_type})</p>
                    <p className="text-sm text-muted-foreground">Room Type</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Bed className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Bed #{selectedBooking.bed_number || "Not specified"}</p>
                    <p className="text-sm text-muted-foreground">Bed Number</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <IndianRupee className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">₹{selectedBooking.rent_per_bed}/month</p>
                    <p className="text-sm text-muted-foreground">Rent per Bed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{new Date(selectedBooking.move_in_date).toLocaleDateString()}</p>
                    <p className="text-sm text-muted-foreground">Move-in Date</p>
                  </div>
                </div>
              </Card>

              {/* Action Buttons */}
              {selectedBooking.status === "pending" && (
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="default"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleUpdateStatus(selectedBooking.id, "confirmed")}
                    disabled={updatingStatus}
                  >
                    {updatingStatus ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <PhoneCall className="h-4 w-4 mr-2" />
                        Mark as Contacted
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleUpdateStatus(selectedBooking.id, "cancelled")}
                    disabled={updatingStatus}
                  >
                    {updatingStatus ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </>
                    )}
                  </Button>
                </div>
              )}

              {selectedBooking.status !== "pending" && (
                <p className="text-center text-sm text-muted-foreground">
                  This booking has already been {selectedBooking.status === "confirmed" ? "contacted" : "rejected"}.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageHostels;
