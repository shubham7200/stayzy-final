import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MapPin, Star, Users, Wifi, Coffee, ChevronLeft, Bed, Home, Check, X, Phone, MessageCircle, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HostelDetails {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  hostel_type: string;
  price_per_month: number;
  available_rooms: number;
  rating: number;
  latitude: number | null;
  longitude: number | null;
  owner_id: string;
  images: { image_url: string; is_primary: boolean }[];
  facilities: string[];
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
  };
}

interface Room {
  id: string;
  hostel_id: string;
  floor: number;
  room_no: string;
  sharing_type: string;
  beds_total: number;
  beds_available: number;
  rent_per_bed: number;
  deposit_amount: number;
  advance_months: number;
  balcony: boolean;
  attached_bath: boolean;
  description: string | null;
}

const HostelDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hostel, setHostel] = useState<HostelDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [moveInDate, setMoveInDate] = useState("");
  const [selectedBedNumber, setSelectedBedNumber] = useState<number | null>(null);
  const [bookedBeds, setBookedBeds] = useState<number[]>([]);
  const [ownerOccupiedBeds, setOwnerOccupiedBeds] = useState<number[]>([]);
  const [loadingBookedBeds, setLoadingBookedBeds] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mobileNumber, setMobileNumber] = useState("");
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingSuccessDialogOpen, setBookingSuccessDialogOpen] = useState(false);
  const [lastBookedBed, setLastBookedBed] = useState<number | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [ownerPhone, setOwnerPhone] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string>("Owner");

  useEffect(() => {
    loadHostelDetails();
    loadReviews();
    loadCurrentUser();
    loadRooms();
  }, [id]);

  // Load owner contact info from profiles table (RLS-protected)
  useEffect(() => {
    if (!hostel) return;
    const fetchOwnerContact = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", hostel.owner_id)
        .maybeSingle();
      setOwnerName(profile?.full_name || "Owner");
      const phone = profile?.phone?.trim();
      setOwnerPhone(phone && phone.length >= 10 ? phone : null);
    };
    fetchOwnerContact();
  }, [hostel?.owner_id]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    
    // Load user role if logged in
    if (user) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      
      setUserRole(roleData?.role || null);
    }
  };

  const loadRooms = async () => {
    try {
      const { data: roomsData, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("hostel_id", id)
        .order("sharing_type", { ascending: true })
        .order("floor", { ascending: true });

      if (error) throw error;
      setRooms(roomsData || []);
    } catch (error: any) {
      console.error("Error loading rooms:", error);
    }
  };

  // Load booked bed numbers for a specific room
  const loadBookedBeds = async (roomId: string) => {
    setLoadingBookedBeds(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("bed_number")
        .eq("room_id", roomId)
        .in("status", ["pending", "confirmed"]);

      if (error) throw error;
      
      // Filter out null values and extract bed numbers
      const beds = (data || [])
        .map(b => b.bed_number)
        .filter((b): b is number => b !== null);
      
      setBookedBeds(beds);
    } catch (error: any) {
      console.error("Error loading booked beds:", error);
      setBookedBeds([]);
    } finally {
      setLoadingBookedBeds(false);
    }
  };

  const handleOpenBookingDialog = (room: Room) => {
    setSelectedRoom(room);
    setSelectedBedNumber(null);
    setBookedBeds([]);
    setOwnerOccupiedBeds((room as any).occupied_bed_numbers || []);
    setMobileNumber(currentUser?.user_metadata?.phone || "");
    setBookingDialogOpen(true);
    loadBookedBeds(room.id);
  };

  const handleBookRoom = async () => {
    // Validate user is logged in
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to book a room",
        variant: "destructive",
      });
      return;
    }

    // Prevent owners and admins from booking
    if (userRole === "owner" || userRole === "admin") {
      toast({
        title: "Booking Not Allowed",
        description: "Only students can book rooms",
        variant: "destructive",
      });
      return;
    }

    if (!selectedRoom) return;

    // Validate move-in date
    if (!moveInDate) {
      toast({
        title: "Error",
        description: "Please select a move-in date",
        variant: "destructive",
      });
      return;
    }

    // Check bed availability
    if (selectedRoom.beds_available <= 0) {
      toast({
        title: "No Beds Available",
        description: "All beds in this room are currently occupied",
        variant: "destructive",
      });
      return;
    }

    // Require bed selection
    if (!selectedBedNumber) {
      toast({
        title: "Error",
        description: "Please select a bed number",
        variant: "destructive",
      });
      return;
    }

    // Verify the selected bed is actually available
    const availableBeds = getAvailableBeds();
    if (!availableBeds.includes(selectedBedNumber)) {
      toast({
        title: "Bed Unavailable",
        description: "This bed is already occupied. Please select another bed.",
        variant: "destructive",
      });
      return;
    }

    // Validate mobile number
    if (!mobileNumber.trim() || mobileNumber.trim().length < 10) {
      toast({
        title: "Error",
        description: "Please enter a valid mobile number (minimum 10 digits)",
        variant: "destructive",
      });
      return;
    }

    const bedToBook = selectedBedNumber;
    setSubmittingBooking(true);

    try {
      // Re-check bed availability from database before booking (prevents stale UI state)
      const { data: freshBookings, error: checkError } = await supabase
        .from("bookings")
        .select("bed_number")
        .eq("room_id", selectedRoom.id)
        .in("status", ["pending", "confirmed"]);

      if (checkError) throw checkError;

      const freshBookedBeds = (freshBookings || [])
        .map(b => b.bed_number)
        .filter((b): b is number => b !== null);

      // Also re-fetch room to get latest owner-occupied beds
      const { data: freshRoom } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", selectedRoom.id)
        .single();

      const freshOwnerOccupied: number[] = (freshRoom as any)?.occupied_bed_numbers || [];

      if (freshBookedBeds.includes(bedToBook) || freshOwnerOccupied.includes(bedToBook)) {
        // Update local state so UI reflects reality
        setBookedBeds(freshBookedBeds);
        setOwnerOccupiedBeds(freshOwnerOccupied);
        setSelectedBedNumber(null);
        toast({
          title: "Bed Unavailable",
          description: "This bed is already occupied. Please select another available bed.",
          variant: "destructive",
        });
        setSubmittingBooking(false);
        return;
      }

      // Use the secure database function for atomic validation + insert
      const { data: bookingResult, error } = await supabase.rpc("validate_and_book_bed", {
        _room_id: selectedRoom.id,
        _user_id: currentUser.id,
        _hostel_id: id,
        _bed_number: bedToBook,
        _move_in_date: moveInDate,
        _rent_per_bed: selectedRoom.rent_per_bed,
        _notes: `Mobile: ${mobileNumber.trim()}`,
      });

      if (error) throw error;

      // Store the booked bed for the success dialog
      setLastBookedBed(bedToBook);
      setBookingDialogOpen(false);
      setBookingSuccessDialogOpen(true);
      setSelectedRoom(null);
      setMoveInDate("");
      setSelectedBedNumber(null);
      setMobileNumber("");
      loadRooms();
    } catch (error: any) {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to submit booking request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Get available beds (not booked yet)
  const getAvailableBeds = (): number[] => {
    if (!selectedRoom) return [];
    const allBeds = Array.from({ length: selectedRoom.beds_total }, (_, i) => i + 1);
    return allBeds.filter(bed => !bookedBeds.includes(bed) && !ownerOccupiedBeds.includes(bed));
  };

  const loadReviews = async () => {
    try {
      const { data: reviewsData, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("hostel_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profile data for each review
      if (reviewsData && reviewsData.length > 0) {
        const userIds = [...new Set(reviewsData.map(r => r.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        const reviewsWithProfiles = reviewsData.map(review => ({
          ...review,
          profiles: {
            full_name: profilesMap.get(review.user_id)?.full_name || "Unknown User"
          }
        }));

        setReviews(reviewsWithProfiles);
      } else {
        setReviews([]);
      }
    } catch (error: any) {
      console.error("Error loading reviews:", error);
    }
  };

  const loadHostelDetails = async () => {
    try {
      const { data: hostelData, error: hostelError } = await supabase
        .from("hostels")
        .select("*")
        .eq("id", id)
        .single();

      if (hostelError) throw hostelError;

      const { data: imagesData } = await supabase
        .from("hostel_images")
        .select("image_url, is_primary")
        .eq("hostel_id", id)
        .order("is_primary", { ascending: false });

      const { data: facilitiesData } = await supabase
        .from("hostel_facilities")
        .select("facility")
        .eq("hostel_id", id);

      setHostel({
        ...hostelData,
        images: imagesData || [],
        facilities: facilitiesData?.map((f) => f.facility) || [],
      });
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

  const handleSubmitReview = async () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to submit a review",
        variant: "destructive",
      });
      return;
    }

    if (newRating === 0) {
      toast({
        title: "Error",
        description: "Please select a rating",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) {
      toast({
        title: "Error",
        description: "Please write a comment",
        variant: "destructive",
      });
      return;
    }

    setSubmittingReview(true);
    try {
      const { error: reviewError } = await supabase
        .from("reviews")
        .insert({
          hostel_id: id,
          user_id: currentUser.id,
          rating: newRating,
          comment: newComment.trim(),
        });

      if (reviewError) throw reviewError;

      // Calculate new average rating
      const allRatings = [...reviews.map(r => r.rating), newRating];
      const avgRating = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;

      // Update hostel rating
      const { error: updateError } = await supabase
        .from("hostels")
        .update({ rating: avgRating })
        .eq("id", id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Review submitted successfully",
      });

      setNewRating(0);
      setNewComment("");
      loadReviews();
      loadHostelDetails();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

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

  if (!hostel) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <p>Hostel not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <Card className="p-0 overflow-hidden">
              {hostel.images.length > 0 ? (
                <>
                  <div className="aspect-video w-full overflow-hidden">
                    <img
                      src={hostel.images[selectedImage]?.image_url}
                      alt={hostel.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {hostel.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2 p-4">
                      {hostel.images.map((img, index) => (
                        <div
                          key={index}
                          className={`aspect-video cursor-pointer rounded-lg overflow-hidden border-2 ${
                            selectedImage === index ? "border-primary" : "border-transparent"
                          }`}
                          onClick={() => setSelectedImage(index)}
                        >
                          <img
                            src={img.image_url}
                            alt={`${hostel.name} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="aspect-video bg-secondary flex items-center justify-center">
                  <p className="text-muted-foreground">No images available</p>
                </div>
              )}
            </Card>

            {/* Details */}
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2">{hostel.name}</h1>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{hostel.address}, {hostel.city}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-accent text-accent" />
                  <span className="font-semibold text-lg">{hostel.rating}</span>
                </div>
              </div>

              <div className="flex gap-2 mb-6">
                <Badge variant="secondary" className="capitalize">{hostel.hostel_type.replace('_', '-')}</Badge>
                <Badge variant="outline">{hostel.available_rooms} Rooms Available</Badge>
              </div>

              {hostel.description && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">About</h2>
                  <p className="text-muted-foreground">{hostel.description}</p>
                </div>
              )}

              {hostel.facilities.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-3">Facilities</h2>
                  <div className="flex flex-wrap gap-2">
                    {hostel.facilities.map((facility) => (
                      <Badge key={facility} variant="secondary">
                        {facility}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Room Types & Pricing Section */}
            <div id="room-types-section">
              {rooms.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-2xl font-semibold mb-6">Room Types & Pricing</h2>
                  <div className="space-y-4">
                  {rooms.map((room) => {
                    // Calculate availability status for visual badges
                    const getAvailabilityBadge = () => {
                      if (room.beds_available === 0) {
                        return { label: "Full", variant: "destructive" as const, className: "bg-destructive text-destructive-foreground" };
                      }
                      if (room.beds_available === room.beds_total) {
                        return { label: "All Available", variant: "default" as const, className: "bg-green-500 text-white" };
                      }
                      if (room.beds_available <= room.beds_total * 0.3) {
                        return { label: "Limited", variant: "secondary" as const, className: "bg-amber-500 text-white" };
                      }
                      return { label: "Available", variant: "outline" as const, className: "bg-green-100 text-green-800 border-green-300" };
                    };
                    
                    const availabilityBadge = getAvailabilityBadge();
                    
                    return (
                    <Card key={room.id} className="p-4 border-border">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{room.sharing_type}</h3>
                            <Badge variant="outline">Floor {room.floor}</Badge>
                            <Badge variant="outline">Room {room.room_no}</Badge>
                          </div>
                          
                          {/* Enhanced bed availability display */}
                          <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
                            <div className="flex items-center gap-2">
                              <Bed className="h-4 w-4" />
                              <span className={room.beds_available === 0 ? "text-destructive font-semibold" : "font-semibold"}>
                                {room.beds_available} out of {room.beds_total} beds available
                              </span>
                            </div>
                            <Badge className={availabilityBadge.className}>
                              {availabilityBadge.label}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                            {room.balcony && (
                              <div className="flex items-center gap-1">
                                <Check className="h-4 w-4 text-green-600" />
                                <span>Balcony</span>
                              </div>
                            )}
                            {room.attached_bath && (
                              <div className="flex items-center gap-1">
                                <Check className="h-4 w-4 text-green-600" />
                                <span>Attached Bath</span>
                              </div>
                            )}
                          </div>

                          {room.description && (
                            <p className="text-sm text-muted-foreground mb-2">{room.description}</p>
                          )}

                          <div className="flex flex-wrap gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Deposit: </span>
                              <span className="font-medium">₹{room.deposit_amount}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Advance: </span>
                              <span className="font-medium">{room.advance_months} month(s)</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="text-right">
                            <div className="text-3xl font-bold text-primary">₹{room.rent_per_bed}</div>
                            <div className="text-sm text-muted-foreground">per bed/month</div>
                          </div>
                          {/* Only show Book Bed button for students when beds are available */}
                          {userRole === "student" && room.beds_available > 0 && (
                            <Button
                              variant="hero"
                              onClick={() => handleOpenBookingDialog(room)}
                            >
                              Book Bed
                            </Button>
                          )}
                          {room.beds_available === 0 && (
                            <Badge variant="destructive">Full</Badge>
                          )}
                          {!currentUser && room.beds_available > 0 && (
                            <Button
                              variant="outline"
                              onClick={() => navigate("/auth")}
                            >
                              Login to Book
                            </Button>
                          )}
                          {currentUser && userRole !== "student" && room.beds_available > 0 && (
                            <p className="text-xs text-muted-foreground">Only students can book</p>
                          )}
                        </div>
                      </div>
                    </Card>
                    );
                  })}
                </div>
              </Card>
            )}
            </div>

            {/* Reviews Section */}
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-6">Reviews</h2>
              
              {/* Submit Review Form */}
              {currentUser && (
                <div className="mb-8 pb-8 border-b">
                  <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-8 w-8 cursor-pointer transition-colors ${
                            star <= newRating
                              ? "fill-accent text-accent"
                              : "text-muted-foreground"
                          }`}
                          onClick={() => setNewRating(star)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Comment</label>
                    <Textarea
                      placeholder="Share your experience..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Button 
                    onClick={handleSubmitReview} 
                    disabled={submittingReview}
                    variant="hero"
                  >
                    {submittingReview ? "Submitting..." : "Submit Review"}
                  </Button>
                </div>
              )}

              {/* Display Reviews */}
              {reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="pb-6 border-b last:border-b-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{review.profiles.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? "fill-accent text-accent"
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-muted-foreground">{review.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No reviews yet. Be the first to review this hostel!
                </p>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-20 z-40">
              <div className="mb-6">
                {rooms.length > 0 ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-1">Starting from</p>
                    <p className="text-3xl font-bold text-primary mb-1">
                      ₹{Math.min(...rooms.map(r => r.rent_per_bed))}
                    </p>
                    <p className="text-muted-foreground">per bed/month</p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-primary mb-1">
                      ₹{hostel.price_per_month}
                    </p>
                    <p className="text-muted-foreground">per month</p>
                  </>
                )}
              </div>

              <Button 
                variant="hero" 
                size="lg" 
                className="w-full mb-4"
                onClick={() => {
                  const element = document.getElementById("room-types-section");
                  element?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                View Rooms
              </Button>

              {userRole === "student" && (
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full mb-3"
                  onClick={() => {
                    if (!ownerPhone) {
                      toast({
                        title: "Phone unavailable",
                        description: "Owner's phone number is not available",
                        variant: "destructive",
                      });
                      return;
                    }
                    setContactDialogOpen(true);
                  }}
                >
                  <Phone className="h-4 w-4" />
                  Contact Owner
                </Button>
              )}

              <Button 
                variant="outline" 
                size="lg" 
                className="w-full flex items-center gap-2"
                onClick={() => {
                  if (hostel.latitude && hostel.longitude) {
                    const link = document.createElement('a');
                    link.href = `https://www.google.com/maps/search/?api=1&query=${hostel.latitude},${hostel.longitude}`;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.click();
                  } else if (hostel.address && hostel.city) {
                    const link = document.createElement('a');
                    link.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hostel.address}, ${hostel.city}`)}`;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.click();
                  } else {
                    toast({
                      title: "Location unavailable",
                      description: "Location data not available for this hostel",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <MapPin className="h-4 w-4" />
                Get Directions
              </Button>

              <div className="mt-6 pt-6 border-t space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium capitalize">{hostel.hostel_type.replace('_', '-')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Available Rooms:</span>
                  <span className="font-medium">{hostel.available_rooms}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">City:</span>
                  <span className="font-medium">{hostel.city}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book a Bed</DialogTitle>
            <DialogDescription>
              Reserve your bed in {selectedRoom?.sharing_type} - Room {selectedRoom?.room_no}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Rent per bed:</span>
                <span className="font-semibold">₹{selectedRoom?.rent_per_bed}/month</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Deposit:</span>
                <span className="font-semibold">₹{selectedRoom?.deposit_amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Advance payment:</span>
                <span className="font-semibold">{selectedRoom?.advance_months} month(s)</span>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex justify-between">
                  <span className="font-medium">Total to pay upfront:</span>
                  <span className="text-lg font-bold text-primary">
                    ₹{selectedRoom ? selectedRoom.deposit_amount + (selectedRoom.rent_per_bed * selectedRoom.advance_months) : 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Bed Selection - always show when beds are available */}
            {selectedRoom && selectedRoom.beds_available >= 1 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Bed Number <span className="text-destructive">*</span>
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Beds shown in red are already occupied and cannot be selected.
                </p>
                {loadingBookedBeds ? (
                  <p className="text-sm text-muted-foreground">Loading available beds...</p>
                ) : (
                  <TooltipProvider delayDuration={200}>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: selectedRoom.beds_total }, (_, i) => i + 1).map((bedNum) => {
                        const isBookedInSystem = bookedBeds.includes(bedNum);
                        const isOwnerOccupied = ownerOccupiedBeds.includes(bedNum);
                        const isOccupied = isBookedInSystem || isOwnerOccupied;
                        const isSelected = selectedBedNumber === bedNum;

                        const bedButton = (
                          <Button
                            key={bedNum}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            disabled={isOccupied}
                            onClick={() => {
                              if (isOccupied) {
                                toast({
                                  title: "Bed Unavailable",
                                  description: "This bed is already occupied. Please select another available bed.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              setSelectedBedNumber(bedNum);
                            }}
                            className={`min-w-[60px] transition-all ${
                              isOccupied 
                                ? "bg-destructive/80 text-destructive-foreground border-destructive cursor-not-allowed hover:bg-destructive/80 opacity-60 pointer-events-auto" 
                                : isSelected 
                                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2" 
                                  : "bg-green-500/10 text-green-700 border-green-500 hover:bg-green-500/20 hover:scale-105"
                            }`}
                            style={isOccupied ? { pointerEvents: 'auto', cursor: 'not-allowed' } : {}}
                          >
                            {isOccupied ? <Lock className="h-3 w-3 mr-1" /> : <Bed className="h-3 w-3 mr-1" />}
                            {bedNum}
                            {isOccupied && <X className="h-3 w-3 ml-1" />}
                          </Button>
                        );

                        return isOccupied ? (
                          <Tooltip key={bedNum}>
                            <TooltipTrigger asChild>
                              {bedButton}
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-destructive text-destructive-foreground text-xs">
                              Already booked
                            </TooltipContent>
                          </Tooltip>
                        ) : bedButton;
                      })}
                    </div>
                  </TooltipProvider>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="inline-block w-3 h-3 bg-destructive rounded mr-1"></span> Occupied
                  <span className="inline-block w-3 h-3 bg-green-500/30 border border-green-500 rounded ml-3 mr-1"></span> Available
                  <span className="ml-3">{getAvailableBeds().length} of {selectedRoom.beds_total} beds available</span>
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                Mobile Number <span className="text-destructive">*</span>
              </label>
              <Input
                type="tel"
                placeholder="Enter your mobile number"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                maxLength={15}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Move-in Date</label>
              <Input
                type="date"
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Your booking request will be sent to the hostel owner. They will contact you to confirm the booking and payment details.
            </p>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setBookingDialogOpen(false)}
              disabled={submittingBooking}
            >
              Cancel
            </Button>
            <Button 
              variant="hero" 
              onClick={handleBookRoom}
              disabled={submittingBooking || !selectedBedNumber || !moveInDate || !mobileNumber.trim()}
            >
              {submittingBooking ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Submitting...
                </>
              ) : (
                "Submit Booking Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Success Confirmation Dialog */}
      <Dialog open={bookingSuccessDialogOpen} onOpenChange={setBookingSuccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center text-green-600 flex items-center justify-center gap-2">
              <Check className="h-6 w-6" />
              Booking Request Submitted!
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-lg font-semibold text-green-800 mb-2">
                🎉 Your request has been sent successfully!
              </p>
              <p className="text-sm text-green-700">
                You requested <strong>Bed #{lastBookedBed}</strong> at <strong>{hostel?.name}</strong>
              </p>
            </div>
            <div className="text-muted-foreground text-sm space-y-2">
              <p>📞 The hostel owner will contact you soon to confirm your booking.</p>
              <p>📧 Please keep your phone handy for their call.</p>
              <p>💡 You can track your booking status in your profile.</p>
            </div>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button 
              variant="hero" 
              onClick={() => setBookingSuccessDialogOpen(false)}
            >
              Got it!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Owner Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-lifted backdrop-blur-sm">
          {/* Header with owner info */}
          <div className="gradient-hero px-6 pt-6 pb-5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg font-bold">
                {ownerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-lg leading-tight">{ownerName}</h3>
                <p className="text-white/80 text-sm">{hostel?.name}</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-6 pt-5 pb-2 flex flex-col gap-3">
            <button
              className="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 shadow-soft hover-lift cursor-pointer group"
              onClick={() => {
                if (ownerPhone) {
                  const phone = ownerPhone.startsWith("+") ? ownerPhone : `+91${ownerPhone.replace(/\D/g, "")}`;
                  const link = document.createElement('a');
                  link.href = `tel:${phone}`;
                  link.click();
                  setContactDialogOpen(false);
                }
              }}
            >
              <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-emerald-800 dark:text-emerald-300">Call Owner</p>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Opens your phone dialer</p>
              </div>
            </button>

            <button
              className="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 shadow-soft hover-lift cursor-pointer group"
              onClick={() => {
                if (ownerPhone) {
                  const phone = ownerPhone.startsWith("+") ? ownerPhone.replace(/\D/g, "") : `91${ownerPhone.replace(/\D/g, "")}`;
                  const message = encodeURIComponent(`Hi, I'm interested in a room at ${hostel?.name}. Could you please share more details?`);
                  const link = document.createElement('a');
                  link.href = `https://wa.me/${phone}?text=${message}`;
                  link.target = '_blank';
                  link.rel = 'noopener noreferrer';
                  link.click();
                  setContactDialogOpen(false);
                }
              }}
            >
              <div className="w-11 h-11 rounded-full bg-[#25D366] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-green-800 dark:text-green-300">WhatsApp Owner</p>
                <p className="text-xs text-green-600/70 dark:text-green-400/70">Opens WhatsApp with a pre-filled message</p>
              </div>
            </button>
          </div>

          {/* Trust text */}
          <div className="px-6 pb-5 pt-2">
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-emerald-500">
                <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
              </svg>
              <span>Your number will not be shared publicly.</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HostelDetails;
