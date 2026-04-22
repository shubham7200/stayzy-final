import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

export interface SearchFilterValues {
  location: string;
  hostelType: string;
  priceRange: number[];
  selectedFacilities: string[];
  minRating: number[];
}

interface SearchFiltersProps {
  filters: SearchFilterValues;
  onFiltersChange: (filters: SearchFilterValues) => void;
  onSearch: () => void;
  loading?: boolean;
}

const facilities = [
  { id: "wifi", label: "WiFi" },
  { id: "laundry", label: "Laundry" },
  { id: "parking", label: "Parking" },
  { id: "gym", label: "Gym" },
  { id: "study", label: "Study Room" },
  { id: "kitchen", label: "Kitchen" },
];

const SearchFilters = ({ filters, onFiltersChange, onSearch, loading }: SearchFiltersProps) => {
  const update = (partial: Partial<SearchFilterValues>) =>
    onFiltersChange({ ...filters, ...partial });

  const toggleFacility = (facilityId: string) => {
    const next = filters.selectedFacilities.includes(facilityId)
      ? filters.selectedFacilities.filter((id) => id !== facilityId)
      : [...filters.selectedFacilities, facilityId];
    update({ selectedFacilities: next });
  };

  return (
    <Card className="p-6 sticky top-24 space-y-6">
      <h2 className="text-2xl font-bold">Filters</h2>

      <div className="space-y-3">
        <Label className="text-base font-semibold">Location</Label>
        <Input
          placeholder="Enter city or area..."
          value={filters.location}
          onChange={(e) => update({ location: e.target.value })}
          className="h-11"
        />
      </div>

      <div className="space-y-3">
        <Label className="text-base font-semibold">Hostel Type</Label>
        <Select value={filters.hostelType} onValueChange={(v) => update({ hostelType: v })}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Hostels</SelectItem>
            <SelectItem value="boys">Boys Only</SelectItem>
            <SelectItem value="girls">Girls Only</SelectItem>
            <SelectItem value="co-ed">Co-ed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Max Price: ₹{filters.priceRange[1]}/month
        </Label>
        <Slider
          value={[filters.priceRange[1]]}
          onValueChange={(v) => update({ priceRange: [0, v[0]] })}
          min={0}
          max={50000}
          step={1000}
          className="py-4"
        />
      </div>

      <div className="space-y-3">
        <Label className="text-base font-semibold">Facilities</Label>
        <div className="grid grid-cols-2 gap-3">
          {facilities.map((facility) => (
            <button
              key={facility.id}
              onClick={() => toggleFacility(facility.id)}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                filters.selectedFacilities.includes(facility.id)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:border-primary/50"
              }`}
            >
              {facility.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Minimum Rating: {filters.minRating[0]}/5
        </Label>
        <Slider
          value={filters.minRating}
          onValueChange={(v) => update({ minRating: v })}
          min={1}
          max={5}
          step={0.5}
          className="py-4"
        />
      </div>

      <Button
        className="w-full h-12 text-base font-semibold rounded-xl"
        size="lg"
        onClick={onSearch}
        disabled={loading}
      >
        <Search className="h-5 w-5" />
        {loading ? "Searching..." : "Search Hostels"}
      </Button>
    </Card>
  );
};

export default SearchFilters;
