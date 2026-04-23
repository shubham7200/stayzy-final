import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2, Bed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

interface RoomFormData {
  floor: string;
  room_no: string;
  sharing_type: string;
  beds_total: string;
  occupied_beds: string; // Changed from beds_available to occupied_beds
  occupied_bed_numbers: number[]; // Track which specific bed numbers are occupied
  rent_per_bed: string;
  deposit_amount: string;
  advance_months: string;
  balcony: boolean;
  attached_bath: boolean;
  description: string;
}

interface RoomManagementProps {
  hostelId: string;
  hostelName?: string;
  isAdmin?: boolean;
}

const sharingTypes = ["2-Bed", "3-Bed", "4-Bed", "5-Bed", "6-Bed", "Single"];

const emptyFormData: RoomFormData = {
  floor: "1",
  room_no: "",
  sharing_type: "2-Bed",
  beds_total: "2",
  occupied_beds: "0", // Start with 0 occupied beds
  occupied_bed_numbers: [], // No beds occupied initially
  rent_per_bed: "",
  deposit_amount: "0",
  advance_months: "1",
  balcony: false,
  attached_bath: false,
  description: "",
};

// Helper to get availability status and badge variant
const getAvailabilityStatus = (available: number, total: number) => {
  if (available === 0) return { status: "Full", variant: "destructive" as const };
  if (available === total) return { status: "All Available", variant: "default" as const };
  if (available <= total * 0.3) return { status: "Limited", variant: "secondary" as const };
  return { status: "Available", variant: "outline" as const };
};

const RoomManagement = ({ hostelId, hostelName, isAdmin = false }: RoomManagementProps) => {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState<RoomFormData>(emptyFormData);
  const [submitting, setSubmitting] = useState(false);

  // Validate hostel_id is a valid UUID
  const isValidHostelId = hostelId && hostelId.length > 0 && 
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hostelId);

  useEffect(() => {
    if (isValidHostelId) {
      loadRooms();
    } else {
      setLoading(false);
    }
  }, [hostelId, isValidHostelId]);

  const loadRooms = async () => {
    if (!isValidHostelId) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("hostel_id", hostelId)
        .order("floor", { ascending: true })
        .order("room_no", { ascending: true });

      if (error) throw error;
      setRooms(data || []);
    } catch (error: any) {
      console.error("Error loading rooms:", error);
      toast({
        title: "Error",
        description: "Failed to load rooms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setEditingRoom(null);
    setFormData(emptyFormData);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = async (room: Room) => {
    setEditingRoom(room);
    // Calculate occupied_beds from beds_total - beds_available
    const occupiedBeds = room.beds_total - room.beds_available;
    
    // Load already booked bed numbers for this room
    let bookedBedNumbers: number[] = [];
    try {
      const { data } = await supabase
        .from("bookings")
        .select("bed_number")
        .eq("room_id", room.id)
        .in("status", ["pending", "confirmed"]);
      
      bookedBedNumbers = (data || [])
        .map(b => b.bed_number)
        .filter((b): b is number => b !== null);
    } catch (error) {
      console.error("Error loading booked beds:", error);
    }

    // Merge owner-marked occupied beds from DB with booking-based occupied beds
    const ownerOccupied: number[] = (room as any).occupied_bed_numbers || [];
    const mergedOccupied = [...new Set([...bookedBedNumbers, ...ownerOccupied])].sort((a, b) => a - b);

    setFormData({
      floor: room.floor.toString(),
      room_no: room.room_no,
      sharing_type: room.sharing_type,
      beds_total: room.beds_total.toString(),
      occupied_beds: mergedOccupied.length.toString(),
      occupied_bed_numbers: mergedOccupied,
      rent_per_bed: room.rent_per_bed.toString(),
      deposit_amount: room.deposit_amount.toString(),
      advance_months: room.advance_months.toString(),
      balcony: room.balcony,
      attached_bath: room.attached_bath,
      description: room.description || "",
    });
    setDialogOpen(true);
  };

  const handleSharingTypeChange = (value: string) => {
    const bedsMap: Record<string, number> = {
      "Single": 1,
      "2-Bed": 2,
      "3-Bed": 3,
      "4-Bed": 4,
      "5-Bed": 5,
      "6-Bed": 6,
    };
    const beds = bedsMap[value] || 2;
    // When changing sharing type, filter out bed numbers that exceed new total
    const filteredOccupiedBeds = formData.occupied_bed_numbers.filter(b => b <= beds);
    setFormData({
      ...formData,
      sharing_type: value,
      beds_total: beds.toString(),
      occupied_beds: filteredOccupiedBeds.length.toString(),
      occupied_bed_numbers: filteredOccupiedBeds,
    });
  };

  // Toggle a bed number as occupied/available
  const toggleOccupiedBed = (bedNum: number) => {
    const isCurrentlyOccupied = formData.occupied_bed_numbers.includes(bedNum);
    let newOccupiedBeds: number[];
    
    if (isCurrentlyOccupied) {
      newOccupiedBeds = formData.occupied_bed_numbers.filter(b => b !== bedNum);
    } else {
      newOccupiedBeds = [...formData.occupied_bed_numbers, bedNum].sort((a, b) => a - b);
    }
    
    setFormData({
      ...formData,
      occupied_beds: newOccupiedBeds.length.toString(),
      occupied_bed_numbers: newOccupiedBeds,
    });
  };

  // Handle occupied beds change with validation
  const handleOccupiedBedsChange = (value: string) => {
    const occupied = parseInt(value) || 0;
    const total = parseInt(formData.beds_total) || 0;
    // Clamp occupied beds to valid range
    const validOccupied = Math.max(0, Math.min(occupied, total));
    setFormData({ ...formData, occupied_beds: validOccupied.toString() });
  };

  // Calculate available beds from total and occupied
  const calculateAvailableBeds = () => {
    const total = parseInt(formData.beds_total) || 0;
    const occupied = parseInt(formData.occupied_beds) || 0;
    return Math.max(0, total - occupied);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.room_no.trim()) {
      toast({
        title: "Validation Error",
        description: "Room number is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.rent_per_bed || formData.rent_per_bed.trim() === "") {
      toast({
        title: "Validation Error",
        description: "Rent per bed is required",
        variant: "destructive",
      });
      return;
    }
    
    const rentPerBed = parseInt(formData.rent_per_bed);
    if (isNaN(rentPerBed) || rentPerBed <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid rent amount",
        variant: "destructive",
      });
      return;
    }
    
    // Validate occupied beds doesn't exceed total
    const total = parseInt(formData.beds_total) || 0;
    const occupied = parseInt(formData.occupied_beds) || 0;
    
    if (occupied > total) {
      toast({
        title: "Validation Error",
        description: "Occupied beds cannot exceed total beds",
        variant: "destructive",
      });
      return;
    }
    
    // Validate hostel_id before proceeding
    if (!isValidHostelId) {
      toast({
        title: "Error",
        description: "Cannot add room: Invalid or missing hostel ID. Please save the hostel first.",
        variant: "destructive",
      });
      return;
    }
    
    setSubmitting(true);

    try {
      // Calculate beds_available from total - occupied
      const bedsAvailable = total - occupied;
      
      const roomData = {
        hostel_id: hostelId,
        floor: parseInt(formData.floor) || 1,
        room_no: formData.room_no.trim(),
        sharing_type: formData.sharing_type,
        beds_total: total,
        beds_available: bedsAvailable,
        rent_per_bed: rentPerBed,
        deposit_amount: parseInt(formData.deposit_amount) || 0,
        advance_months: parseInt(formData.advance_months) || 1,
        balcony: formData.balcony,
        attached_bath: formData.attached_bath,
        description: formData.description || null,
      };

      // Include occupied_bed_numbers for DB persistence
      const roomDataWithOccupied = {
        ...roomData,
        occupied_bed_numbers: formData.occupied_bed_numbers,
      };

      if (editingRoom) {
        const { error } = await supabase
          .from("rooms")
          .update(roomDataWithOccupied as any)
          .eq("id", editingRoom.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Room updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("rooms")
          .insert(roomDataWithOccupied as any);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Room added successfully",
        });
      }

      setDialogOpen(false);
      loadRooms();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (roomId: string) => {
    if (!confirm("Are you sure you want to delete this room?")) return;

    try {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", roomId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Room deleted successfully",
      });

      loadRooms();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Show message if hostel_id is invalid
  if (!isValidHostelId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bed className="h-5 w-5" />
            Room Types & Pricing
          </h3>
        </div>
        <Card className="p-8 text-center">
          <Bed className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Save Hostel First</h3>
          <p className="text-muted-foreground">
            Please save the hostel before adding rooms. Rooms can be added after the hostel is created.
          </p>
        </Card>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bed className="h-5 w-5" />
            Room Types & Pricing
          </h3>
          {hostelName && (
            <p className="text-sm text-muted-foreground">{hostelName}</p>
          )}
        </div>
        <Button type="button" onClick={handleOpenAddDialog} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Room
        </Button>
      </div>

      {rooms.length === 0 ? (
        <Card className="p-8 text-center">
          <Bed className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Rooms Added</h3>
          <p className="text-muted-foreground mb-4">
            Add room types with pricing to show availability to students.
          </p>
          <Button type="button" onClick={handleOpenAddDialog}>
            <Plus className="h-4 w-4 mr-1" />
            Add Your First Room
          </Button>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Beds</TableHead>
                <TableHead>Rent/Bed</TableHead>
                <TableHead>Deposit</TableHead>
                <TableHead>Amenities</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((room) => {
                const availabilityInfo = getAvailabilityStatus(room.beds_available, room.beds_total);
                const occupiedBeds = room.beds_total - room.beds_available;
                return (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">{room.room_no}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{room.sharing_type}</Badge>
                  </TableCell>
                  <TableCell>{room.floor}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className={room.beds_available === 0 ? "text-destructive font-medium" : "text-green-600 font-medium"}>
                        {room.beds_available} of {room.beds_total} available
                      </span>
                      <Badge variant={availabilityInfo.variant} className="w-fit text-xs">
                        {availabilityInfo.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>₹{room.rent_per_bed}</TableCell>
                  <TableCell>₹{room.deposit_amount}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {room.balcony && <Badge variant="outline" className="text-xs">Balcony</Badge>}
                      {room.attached_bath && <Badge variant="outline" className="text-xs">Attached Bath</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditDialog(room)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(room.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Room Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? "Edit Room" : "Add New Room"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="room_no">Room Number *</Label>
                <Input
                  id="room_no"
                  required
                  placeholder="e.g., 101, A1"
                  value={formData.room_no}
                  onChange={(e) => setFormData({ ...formData, room_no: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="floor">Floor *</Label>
                <Input
                  id="floor"
                  type="number"
                  required
                  min="0"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sharing_type">Room Type *</Label>
                <Select
                  value={formData.sharing_type}
                  onValueChange={handleSharingTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sharingTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Occupied Beds</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Click on beds that are already occupied (shown in red)
                </p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: parseInt(formData.beds_total) || 0 }, (_, i) => i + 1).map((bedNum) => {
                    const isOccupied = formData.occupied_bed_numbers.includes(bedNum);
                    return (
                      <Button
                        key={bedNum}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleOccupiedBed(bedNum)}
                        className={`min-w-[50px] ${
                          isOccupied 
                            ? "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90" 
                            : "bg-green-500/10 text-green-700 border-green-500 hover:bg-green-500/20"
                        }`}
                      >
                        <Bed className="h-3 w-3 mr-1" />
                        {bedNum}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Available: {calculateAvailableBeds()} of {formData.beds_total} beds
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rent_per_bed">Rent per Bed (₹) *</Label>
                <Input
                  id="rent_per_bed"
                  type="number"
                  required
                  min="0"
                  value={formData.rent_per_bed}
                  onChange={(e) => setFormData({ ...formData, rent_per_bed: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="deposit_amount">Deposit (₹)</Label>
                <Input
                  id="deposit_amount"
                  type="number"
                  min="0"
                  value={formData.deposit_amount}
                  onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="advance_months">Advance (Months)</Label>
              <Input
                id="advance_months"
                type="number"
                min="0"
                max="12"
                value={formData.advance_months}
                onChange={(e) => setFormData({ ...formData, advance_months: e.target.value })}
              />
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="balcony"
                  checked={formData.balcony}
                  onCheckedChange={(checked) => setFormData({ ...formData, balcony: checked })}
                />
                <Label htmlFor="balcony">Balcony</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="attached_bath"
                  checked={formData.attached_bath}
                  onCheckedChange={(checked) => setFormData({ ...formData, attached_bath: checked })}
                />
                <Label htmlFor="attached_bath">Attached Bath</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                rows={2}
                placeholder="Any additional details about this room..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingRoom ? "Update Room" : "Add Room"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoomManagement;
