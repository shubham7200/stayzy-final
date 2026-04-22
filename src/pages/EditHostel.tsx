import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Loader2, LocateFixed } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import RoomManagement from "@/components/RoomManagement";

interface ExistingImage {
  id: string;
  image_url: string;
  is_primary: boolean;
}

const EditHostel = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    hostel_type: "boys",
    price_per_month: "",
    available_rooms: "",
    latitude: "",
    longitude: "",
    facilities: [] as string[],
  });

  const facilityOptions = [
    "WiFi", "Kitchen", "Laundry", "AC", "Common Area", 
    "Security", "Parking", "Food", "Study Room", "Gym"
  ];

  useEffect(() => {
    const loadRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        setUserRole(roleData?.role || null);
      }
    };
    loadRole();
    loadHostelData();
  }, [id]);

  const isAdmin = userRole === "admin";

  const loadHostelData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: hostelData, error: hostelError } = await supabase
        .from("hostels")
        .select(`
          *,
          hostel_images(*),
          hostel_facilities(*)
        `)
        .eq("id", id)
        .eq("owner_id", session.user.id)
        .single();

      if (hostelError) throw hostelError;

      if (!hostelData) {
        toast({
          title: "Error",
          description: "Hostel not found or you don't have permission to edit it",
          variant: "destructive",
        });
        navigate("/manage-hostels");
        return;
      }

      setFormData({
        name: hostelData.name,
        description: hostelData.description || "",
        address: hostelData.address,
        city: hostelData.city,
        hostel_type: hostelData.hostel_type,
        price_per_month: hostelData.price_per_month.toString(),
        available_rooms: hostelData.available_rooms?.toString() || "0",
        latitude: hostelData.latitude?.toString() || "",
        longitude: hostelData.longitude?.toString() || "",
        facilities: hostelData.hostel_facilities.map((f: any) => f.facility),
      });

      setExistingImages(hostelData.hostel_images);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/manage-hostels");
    } finally {
      setLoadingData(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const images = Array.from(e.target.files);
      setNewImages([...newImages, ...images]);
    }
  };

  const removeNewImage = (index: number) => {
    setNewImages(newImages.filter((_, i) => i !== index));
  };

  const removeExistingImage = async (imageId: string, imageUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split("/hostel-images/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("hostel-images").remove([filePath]);
      }

      await supabase.from("hostel_images").delete().eq("id", imageId);
      setExistingImages(existingImages.filter((img) => img.id !== imageId));
      
      toast({
        title: "Success",
        description: "Image removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleFacility = (facility: string) => {
    setFormData({
      ...formData,
      facilities: formData.facilities.includes(facility)
        ? formData.facilities.filter((f) => f !== facility)
        : [...formData.facilities, facility],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update hostel basic info
      const { error: updateError } = await supabase
        .from("hostels")
        .update({
          name: formData.name,
          description: formData.description,
          address: formData.address,
          city: formData.city,
          hostel_type: formData.hostel_type as "boys" | "girls" | "co-ed",
          price_per_month: parseInt(formData.price_per_month),
          available_rooms: parseInt(formData.available_rooms),
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // Upload new images
      for (let i = 0; i < newImages.length; i++) {
        const image = newImages[i];
        const fileExt = image.name.split(".").pop();
        const fileName = `${id}/${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("hostel-images")
          .upload(fileName, image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("hostel-images")
          .getPublicUrl(fileName);

        await supabase.from("hostel_images").insert({
          hostel_id: id,
          image_url: publicUrl,
          is_primary: existingImages.length === 0 && i === 0,
        });
      }

      // Update facilities - delete old ones and insert new ones
      await supabase.from("hostel_facilities").delete().eq("hostel_id", id);
      
      for (const facility of formData.facilities) {
        await supabase.from("hostel_facilities").insert({
          hostel_id: id,
          facility,
        });
      }

      toast({
        title: "Success",
        description: "Hostel updated successfully!",
      });

      navigate("/manage-hostels");
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

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Edit Hostel</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Hostel Name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="type">Hostel Type *</Label>
                    <Select value={formData.hostel_type} onValueChange={(value) => setFormData({ ...formData, hostel_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="boys">Boys</SelectItem>
                        <SelectItem value="girls">Girls</SelectItem>
                        <SelectItem value="co-ed">Co-Ed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price per Month (₹) *</Label>
                    <Input
                      id="price"
                      type="number"
                      required
                      value={formData.price_per_month}
                      onChange={(e) => setFormData({ ...formData, price_per_month: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="rooms">Available Rooms *</Label>
                    <Input
                      id="rooms"
                      type="number"
                      required
                      value={formData.available_rooms}
                      onChange={(e) => setFormData({ ...formData, available_rooms: e.target.value })}
                    />
                  </div>
                </div>

                {/* Location Fields */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Hostel Location (GPS)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={fetchingLocation}
                      onClick={() => {
                        if (!navigator.geolocation) {
                          toast({ title: "Error", description: "Geolocation is not supported by your browser", variant: "destructive" });
                          return;
                        }
                        setFetchingLocation(true);
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            setFormData(prev => ({
                              ...prev,
                              latitude: position.coords.latitude.toFixed(6),
                              longitude: position.coords.longitude.toFixed(6),
                            }));
                            setFetchingLocation(false);
                            toast({ title: "Location captured", description: "Latitude and longitude have been auto-filled." });
                          },
                          (error) => {
                            setFetchingLocation(false);
                            toast({ title: "Location access denied", description: "Please enter coordinates manually.", variant: "destructive" });
                          },
                          { enableHighAccuracy: true, timeout: 10000 }
                        );
                      }}
                    >
                      {fetchingLocation ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <LocateFixed className="h-4 w-4 mr-1" />}
                      Use Current Location
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        placeholder="e.g. 17.385044"
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        placeholder="e.g. 78.486671"
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Used for Google Maps directions. You can enter manually or use the button above.</p>
                </div>

            </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Facilities</h2>
              <div className="flex flex-wrap gap-2">
                {facilityOptions.map((facility) => (
                  <Button
                    key={facility}
                    type="button"
                    variant={formData.facilities.includes(facility) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleFacility(facility)}
                  >
                    {facility}
                  </Button>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Images</h2>
              
              <div className="space-y-4">
                {existingImages.length > 0 && (
                  <div>
                    <Label className="mb-2 block">Current Images</Label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                      {existingImages.map((image, index) => (
                        <div key={image.id} className="relative aspect-square">
                          <img
                            src={image.image_url}
                            alt={`Hostel ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => removeExistingImage(image.id, image.image_url)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          {image.is_primary && (
                            <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                              Primary
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="images" className="cursor-pointer">
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-secondary/50 transition-smooth">
                      <Upload className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload new images or drag and drop
                      </p>
                    </div>
                    <Input
                      id="images"
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </Label>
                </div>

                {newImages.length > 0 && (
                  <div>
                    <Label className="mb-2 block">New Images to Upload</Label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                      {newImages.map((image, index) => (
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
                            onClick={() => removeNewImage(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Room Management Section - Only show when hostel_id is valid */}
            {id && id.length > 0 && (
              <Card className="p-6">
                <RoomManagement hostelId={id} />
              </Card>
            )}

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/manage-hostels")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="hero" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Hostel"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditHostel;
