import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { CheckCircle, XCircle, Trash2, Loader2, Upload, X, Edit, Bed, Bell, User, Phone, Home, Building2, IndianRupee, Calendar, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import RoomManagement from "@/components/RoomManagement";

// Admin access is now verified server-side via user_roles table and RLS policies

interface Hostel {
  id: string;
  name: string;
  address: string;
  city: string;
  price_per_month: number;
  approved: boolean;
  available_rooms: number;
  owner_id: string;
  description: string;
  hostel_type: "boys" | "girls" | "co-ed";
  owner_profile?: { full_name: string; } | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  approved: boolean;
  created_at: string;
  user_profile?: { full_name: string; } | null;
  hostel?: { name: string; } | null;
}

interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  suspended: boolean;
  user_roles: { role: string }[];
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
  student_name: string;
  student_phone: string;
  hostel_name: string;
  room_no: string;
  sharing_type: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [newHostelForm, setNewHostelForm] = useState({
    name: "",
    address: "",
    city: "",
    price_per_month: "",
    available_rooms: "",
    description: "",
    hostel_type: "boys" as "boys" | "girls" | "co-ed",
    owner_email: "",
    owner_password: "",
    owner_name: "",
    owner_phone: "",
    facilities: [] as string[],
  });
  const [newHostelImages, setNewHostelImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingHostel, setEditingHostel] = useState<Hostel | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    address: "",
    city: "",
    price_per_month: "",
    available_rooms: "",
    description: "",
    hostel_type: "boys" as "boys" | "girls" | "co-ed",
  });
  const [viewingHostel, setViewingHostel] = useState<Hostel | null>(null);
  const [hostelImages, setHostelImages] = useState<{ image_url: string; is_primary: boolean }[]>([]);
  const [selectedHostelForRooms, setSelectedHostelForRooms] = useState<Hostel | null>(null);

  const facilityOptions = [
    "WiFi", "Kitchen", "Laundry", "AC", "Common Area", 
    "Security", "Parking", "Food", "Study Room", "Gym"
  ];

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Access Denied",
          description: "Please log in to access this page",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Check admin role from database
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError) {
        console.error("Error checking admin role:", roleError);
        toast({
          title: "Error",
          description: "Failed to verify admin access",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      await loadData();
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/");
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadHostels(), loadReviews(), loadUsers(), loadBookingRequests()]);
    setLoading(false);
  };

  const loadBookingRequests = async () => {
    setLoadingBookings(true);
    try {
      // Get all hostels for mapping
      const { data: allHostels } = await supabase
        .from("hostels")
        .select("id, name");

      const hostelMap = new Map((allHostels || []).map(h => [h.id, h.name]));

      // Get all bookings (admin can see all)
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich with student profiles and room details
      const enrichedBookings = await Promise.all(
        (bookings || []).map(async (booking) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("id", booking.user_id)
            .maybeSingle();

          const { data: room } = await supabase
            .from("rooms")
            .select("room_no, sharing_type")
            .eq("id", booking.room_id)
            .maybeSingle();

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
      console.error("Error loading bookings:", error);
    } finally {
      setLoadingBookings(false);
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

  const loadHostels = async () => {
    const { data, error } = await supabase
      .from("hostels")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading hostels:", error);
      return;
    }

    // Load owner names separately
    const hostelsWithOwners = await Promise.all(
      (data || []).map(async (hostel) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", hostel.owner_id)
          .single();
        return { ...hostel, owner_profile: profile };
      })
    );
    
    setHostels(hostelsWithOwners);
  };

  const loadReviews = async () => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading reviews:", error);
      return;
    }

    // Load user and hostel names separately
    const reviewsWithDetails = await Promise.all(
      (data || []).map(async (review) => {
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", review.user_id)
          .single();
        
        const { data: hostel } = await supabase
          .from("hostels")
          .select("name")
          .eq("id", review.hostel_id)
          .single();
        
        return { ...review, user_profile: userProfile, hostel };
      })
    );

    setReviews(reviewsWithDetails);
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*");

    if (error) {
      console.error("Error loading users:", error);
      return;
    }

    // Load user roles separately
    const usersWithRoles = await Promise.all(
      (data || []).map(async (profile) => {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", profile.id);
        
        return { ...profile, user_roles: roles || [] };
      })
    );

    setUsers(usersWithRoles);
  };

  const handleApproveHostel = async (hostelId: string, approved: boolean) => {
    const { error } = await supabase
      .from("hostels")
      .update({ approved })
      .eq("id", hostelId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update hostel status",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Hostel ${approved ? "approved" : "unapproved"}`,
    });
    loadHostels();
  };

  const handleRejectHostel = async (hostelId: string) => {
    const { error } = await supabase
      .from("hostels")
      .delete()
      .eq("id", hostelId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject hostel",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Hostel rejected and removed",
    });
    loadHostels();
  };

  const handleApproveReview = async (reviewId: string, approved: boolean) => {
    const { error } = await supabase
      .from("reviews")
      .update({ approved })
      .eq("id", reviewId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update review status",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Review ${approved ? "approved" : "rejected"}`,
    });
    loadReviews();
  };

  const handleDeleteReview = async (reviewId: string) => {
    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Review deleted",
    });
    loadReviews();
  };

  const handleAddHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Create owner account first
      const { data: ownerData, error: ownerError } = await supabase.functions.invoke(
        'create-owner-account',
        {
          body: {
            email: newHostelForm.owner_email,
            password: newHostelForm.owner_password,
            full_name: newHostelForm.owner_name,
            phone: newHostelForm.owner_phone,
          }
        }
      );

      if (ownerError || !ownerData.success) {
        toast({
          title: "Error",
          description: ownerData?.error || "Failed to create owner account",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Insert hostel with the new owner's ID
      const { data: hostelData, error: hostelError } = await supabase
        .from("hostels")
        .insert({
          name: newHostelForm.name,
          address: newHostelForm.address,
          city: newHostelForm.city,
          price_per_month: parseInt(newHostelForm.price_per_month),
          available_rooms: parseInt(newHostelForm.available_rooms),
          description: newHostelForm.description,
          hostel_type: newHostelForm.hostel_type,
          owner_id: ownerData.user_id,
          approved: false,
        })
        .select()
        .single();

      if (hostelError || !hostelData) {
        toast({
          title: "Error",
          description: "Failed to create hostel",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Upload images
      for (let i = 0; i < newHostelImages.length; i++) {
        const image = newHostelImages[i];
        const fileExt = image.name.split(".").pop();
        const fileName = `${hostelData.id}/${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("hostel-images")
          .upload(fileName, image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("hostel-images")
          .getPublicUrl(fileName);

        await supabase.from("hostel_images").insert({
          hostel_id: hostelData.id,
          image_url: publicUrl,
          is_primary: i === 0,
        });
      }

      // Add facilities
      for (const facility of newHostelForm.facilities) {
        await supabase.from("hostel_facilities").insert({
          hostel_id: hostelData.id,
          facility,
        });
      }

      toast({
        title: "Success",
        description: "Hostel and owner account created successfully!",
      });

      // Reset form
      setNewHostelForm({
        name: "",
        address: "",
        city: "",
        price_per_month: "",
        available_rooms: "",
        description: "",
        hostel_type: "boys",
        owner_email: "",
        owner_password: "",
        owner_name: "",
        owner_phone: "",
        facilities: [],
      });
      setNewHostelImages([]);

      loadHostels();
    } catch (error) {
      console.error("Error adding hostel:", error);
      toast({
        title: "Error",
        description: "Failed to add hostel",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  const handleEditHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHostel) return;

    try {
      const { error } = await supabase
        .from("hostels")
        .update({
          name: editForm.name,
          address: editForm.address,
          city: editForm.city,
          price_per_month: parseInt(editForm.price_per_month),
          available_rooms: parseInt(editForm.available_rooms),
          description: editForm.description,
          hostel_type: editForm.hostel_type,
        })
        .eq("id", editingHostel.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Hostel updated successfully",
      });

      setEditingHostel(null);
      loadHostels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (hostel: Hostel) => {
    setEditingHostel(hostel);
    setEditForm({
      name: hostel.name,
      address: hostel.address,
      city: (hostel as any).city || "",
      price_per_month: hostel.price_per_month.toString(),
      available_rooms: hostel.available_rooms.toString(),
      description: (hostel as any).description || "",
      hostel_type: (hostel as any).hostel_type || "boys",
    });
  };

  const openViewDialog = async (hostel: Hostel) => {
    setViewingHostel(hostel);
    
    // Load hostel images
    const { data: imagesData } = await supabase
      .from("hostel_images")
      .select("image_url, is_primary")
      .eq("hostel_id", hostel.id)
      .order("is_primary", { ascending: false });
    
    setHostelImages(imagesData || []);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const images = Array.from(e.target.files);
      setNewHostelImages([...newHostelImages, ...images]);
    }
  };

  const removeImage = (index: number) => {
    setNewHostelImages(newHostelImages.filter((_, i) => i !== index));
  };

  const toggleFacility = (facility: string) => {
    setNewHostelForm({
      ...newHostelForm,
      facilities: newHostelForm.facilities.includes(facility)
        ? newHostelForm.facilities.filter((f) => f !== facility)
        : [...newHostelForm.facilities, facility],
    });
  };

  const handleChangeRole = async (userId: string, newRole: "student" | "owner" | "admin") => {
    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
      return;
    }

    const { error: insertError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: newRole });

    if (insertError) {
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "User role updated",
    });
    loadUsers();
  };

  const handleSuspendUser = async (userId: string, suspended: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ suspended })
      .eq("id", userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `User ${suspended ? "suspended" : "activated"}`,
    });
    loadUsers();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-4xl font-bold mb-8">Admin Dashboard</h1>

        <Tabs defaultValue="hostels" className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-6">
              <TabsTrigger value="hostels" className="text-xs sm:text-sm whitespace-nowrap">Hostels</TabsTrigger>
              <TabsTrigger value="add-hostel" className="text-xs sm:text-sm whitespace-nowrap">Add Hostel</TabsTrigger>
              <TabsTrigger value="rooms" className="text-xs sm:text-sm whitespace-nowrap">Rooms</TabsTrigger>
              <TabsTrigger value="bookings" className="relative text-xs sm:text-sm whitespace-nowrap">
                <Bell className="h-4 w-4 mr-1" />
                Bookings
                {bookingRequests.filter(b => b.status === "pending").length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {bookingRequests.filter(b => b.status === "pending").length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="reviews" className="text-xs sm:text-sm whitespace-nowrap">Reviews</TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm whitespace-nowrap">Users</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="hostels">
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">Hostel Approval</h2>
              <div className="overflow-x-auto -mx-6 px-6">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Rent</TableHead>
                    <TableHead>Rooms</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hostels.map((hostel) => (
                    <TableRow key={hostel.id}>
                      <TableCell className="font-medium">{hostel.name}</TableCell>
                      <TableCell>{hostel.owner_profile?.full_name || "N/A"}</TableCell>
                      <TableCell>₹{hostel.price_per_month}/mo</TableCell>
                      <TableCell>{hostel.available_rooms}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            hostel.approved
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {hostel.approved ? "Approved" : "Pending"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openViewDialog(hostel)}
                          >
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(hostel)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          {!hostel.approved && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApproveHostel(hostel.id, true)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectHostel(hostel.id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {hostel.approved && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleApproveHostel(hostel.id, false)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Unapprove
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="add-hostel">
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-2xl font-semibold mb-4">Add New Hostel</h2>
              <form onSubmit={handleAddHostel} className="space-y-4 max-w-2xl">
                <div>
                  <Label htmlFor="name">Hostel Name</Label>
                  <Input
                    id="name"
                    value={newHostelForm.name}
                    onChange={(e) => setNewHostelForm({ ...newHostelForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={newHostelForm.address}
                    onChange={(e) => setNewHostelForm({ ...newHostelForm, address: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={newHostelForm.city}
                    onChange={(e) => setNewHostelForm({ ...newHostelForm, city: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price">Rent (per month)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={newHostelForm.price_per_month}
                    onChange={(e) => setNewHostelForm({ ...newHostelForm, price_per_month: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="rooms">Available Rooms</Label>
                  <Input
                    id="rooms"
                    type="number"
                    value={newHostelForm.available_rooms}
                    onChange={(e) => setNewHostelForm({ ...newHostelForm, available_rooms: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newHostelForm.description}
                    onChange={(e) => setNewHostelForm({ ...newHostelForm, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Hostel Type</Label>
                  <select
                    id="type"
                    className="w-full border rounded-md p-2"
                    value={newHostelForm.hostel_type}
                    onChange={(e) =>
                      setNewHostelForm({ ...newHostelForm, hostel_type: e.target.value as any })
                    }
                  >
                    <option value="boys">Boys</option>
                    <option value="girls">Girls</option>
                    <option value="co-ed">Co-ed</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="owner-name">Owner Full Name</Label>
                  <Input
                    id="owner-name"
                    value={newHostelForm.owner_name}
                    onChange={(e) => setNewHostelForm({ ...newHostelForm, owner_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="owner-phone">Owner Mobile Number</Label>
                  <Input
                    id="owner-phone"
                    type="tel"
                    value={newHostelForm.owner_phone}
                    onChange={(e) => setNewHostelForm({ ...newHostelForm, owner_phone: e.target.value })}
                    placeholder="10-digit mobile number"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="owner-email">Owner Email</Label>
                  <Input
                    id="owner-email"
                    type="email"
                    value={newHostelForm.owner_email}
                    onChange={(e) => setNewHostelForm({ ...newHostelForm, owner_email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="owner-password">Owner Password</Label>
                  <Input
                    id="owner-password"
                    type="password"
                    value={newHostelForm.owner_password}
                    onChange={(e) => setNewHostelForm({ ...newHostelForm, owner_password: e.target.value })}
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Facilities</Label>
                  <div className="flex flex-wrap gap-2">
                    {facilityOptions.map((facility) => (
                      <Button
                        key={facility}
                        type="button"
                        variant={newHostelForm.facilities.includes(facility) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleFacility(facility)}
                      >
                        {facility}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="hostel-images" className="cursor-pointer">
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-secondary/50 transition-smooth">
                      <Upload className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload hostel images or drag and drop
                      </p>
                    </div>
                    <Input
                      id="hostel-images"
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </Label>
                </div>

                {newHostelImages.length > 0 && (
                  <div>
                    <Label className="mb-2 block">Images to Upload ({newHostelImages.length})</Label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                      {newHostelImages.map((image, index) => (
                        <div key={index} className="relative aspect-square">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Adding...</> : "Add Hostel"}
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="rooms">
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Bed className="h-6 w-6" />
                Manage Rooms
              </h2>
              
              {!selectedHostelForRooms ? (
                <div>
                  <p className="text-muted-foreground mb-4">Select a hostel to manage its rooms:</p>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {hostels.map((hostel) => (
                      <div
                        key={hostel.id}
                        className="border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors"
                        onClick={() => setSelectedHostelForRooms(hostel)}
                      >
                        <h3 className="font-semibold">{hostel.name}</h3>
                        <p className="text-sm text-muted-foreground">{hostel.city}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={hostel.approved ? "default" : "secondary"}>
                            {hostel.approved ? "Approved" : "Pending"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {hostel.owner_profile?.full_name || "N/A"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mb-4"
                    onClick={() => setSelectedHostelForRooms(null)}
                  >
                    ← Back to Hostel List
                  </Button>
                  <RoomManagement
                    hostelId={selectedHostelForRooms.id}
                    hostelName={selectedHostelForRooms.name}
                    isAdmin={true}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bookings">
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-2xl font-semibold mb-4">All Booking Requests</h2>
              <p className="text-sm text-muted-foreground mb-4">
                View all booking requests across all hostels. Admins can view but cannot modify or create bookings.
              </p>
              {loadingBookings ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : bookingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No Booking Requests</h3>
                  <p className="text-muted-foreground">
                    When students request to book hostels, they will appear here.
                  </p>
                </div>
              ) : (
                <Table>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedBooking(booking)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-2xl font-semibold mb-4">Manage Reviews</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Hostel</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>{review.user_profile?.full_name || "N/A"}</TableCell>
                      <TableCell>{review.hostel?.name || "N/A"}</TableCell>
                      <TableCell>{review.rating}/5</TableCell>
                      <TableCell className="max-w-xs truncate">{review.comment}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            review.approved
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {review.approved ? "Approved" : "Pending"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!review.approved && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApproveReview(review.id, true)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {review.approved && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveReview(review.id, false)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteReview(review.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-2xl font-semibold mb-4">Manage Users</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.phone || "N/A"}</TableCell>
                      <TableCell>
                        <select
                          className="border rounded px-2 py-1"
                          value={user.user_roles[0]?.role || "student"}
                          onChange={(e) =>
                            handleChangeRole(user.id, e.target.value as any)
                          }
                        >
                          <option value="student">Student</option>
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            user.suspended
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {user.suspended ? "Suspended" : "Active"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={user.suspended ? "default" : "destructive"}
                          onClick={() => handleSuspendUser(user.id, !user.suspended)}
                        >
                          {user.suspended ? "Activate" : "Suspend"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* View Hostel Details Dialog */}
        <Dialog open={!!viewingHostel} onOpenChange={() => {
          setViewingHostel(null);
          setHostelImages([]);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Hostel Details</DialogTitle>
            </DialogHeader>
            {viewingHostel && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Hostel Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <p className="text-sm text-muted-foreground">{viewingHostel.name}</p>
                    </div>
                    <div>
                      <Label>City</Label>
                      <p className="text-sm text-muted-foreground">{viewingHostel.city}</p>
                    </div>
                    <div>
                      <Label>Address</Label>
                      <p className="text-sm text-muted-foreground">{viewingHostel.address}</p>
                    </div>
                    <div>
                      <Label>Type</Label>
                      <p className="text-sm text-muted-foreground capitalize">{viewingHostel.hostel_type}</p>
                    </div>
                    <div>
                      <Label>Rent</Label>
                      <p className="text-sm text-muted-foreground">₹{viewingHostel.price_per_month}/month</p>
                    </div>
                    <div>
                      <Label>Available Rooms</Label>
                      <p className="text-sm text-muted-foreground">{viewingHostel.available_rooms}</p>
                    </div>
                    <div className="col-span-2">
                      <Label>Description</Label>
                      <p className="text-sm text-muted-foreground">{viewingHostel.description || "No description"}</p>
                    </div>
                  </div>
                </div>

                {hostelImages.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Photos</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {hostelImages.map((image, index) => (
                        <div key={index} className="relative aspect-video rounded-lg overflow-hidden border">
                          <img
                            src={image.image_url}
                            alt={`${viewingHostel.name} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {image.is_primary && (
                            <Badge className="absolute top-2 left-2" variant="default">
                              Primary
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hostelImages.length === 0 && (
                  <div className="text-center py-8 bg-secondary/50 rounded-lg">
                    <p className="text-muted-foreground">No images uploaded for this hostel</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Hostel Dialog */}
        <Dialog open={!!editingHostel} onOpenChange={() => setEditingHostel(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Hostel</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditHostel} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Hostel Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-price">Rent (per month)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={editForm.price_per_month}
                  onChange={(e) => setEditForm({ ...editForm, price_per_month: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-rooms">Available Rooms</Label>
                <Input
                  id="edit-rooms"
                  type="number"
                  value={editForm.available_rooms}
                  onChange={(e) => setEditForm({ ...editForm, available_rooms: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-type">Hostel Type</Label>
                <Select value={editForm.hostel_type} onValueChange={(value) => setEditForm({ ...editForm, hostel_type: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boys">Boys</SelectItem>
                    <SelectItem value="girls">Girls</SelectItem>
                    <SelectItem value="co-ed">Co-ed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setEditingHostel(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Booking Details Dialog (Read-only for Admin) */}
        <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Booking Request Details</DialogTitle>
            </DialogHeader>
            
            {selectedBooking && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  {getStatusBadge(selectedBooking.status)}
                </div>

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
                      <p className="font-medium">{selectedBooking.room_no} ({selectedBooking.sharing_type})</p>
                      <p className="text-sm text-muted-foreground">Room Details</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Bed className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Bed #{selectedBooking.bed_number || "N/A"}</p>
                      <p className="text-sm text-muted-foreground">Selected Bed</p>
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

                <p className="text-xs text-muted-foreground text-center">
                  Request submitted on {new Date(selectedBooking.created_at).toLocaleDateString()}
                </p>
                
                <p className="text-sm text-center text-muted-foreground border-t pt-4">
                  Admins can view booking details but cannot modify them. Only the hostel owner can update booking status.
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Admin;
