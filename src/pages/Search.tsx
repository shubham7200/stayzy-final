import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SearchFilters, { SearchFilterValues } from "@/components/SearchFilters";
import HostelCard from "@/components/HostelCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Hostel {
  id: string;
  name: string;
  address: string;
  city: string;
  price_per_month: number;
  rating: number;
  approved: boolean;
  images: { image_url: string; is_primary: boolean }[];
  facilities: string[];
  lowestRentPerBed?: number | null;
}

const defaultFilters: SearchFilterValues = {
  location: "",
  hostelType: "all",
  priceRange: [0, 50000],
  selectedFacilities: [],
  minRating: [1],
};

const Search = () => {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SearchFilterValues>(defaultFilters);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const locationParam = searchParams.get("location");
    const initialFilters = { ...defaultFilters };
    let shouldSearch = false;

    if (locationParam) {
      initialFilters.location = locationParam;
      shouldSearch = true;
    }

    setFilters(initialFilters);
    setHasSearched(shouldSearch);

    const applyGenderFilter = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { 
          loadHostels(initialFilters); 
          return; 
        }

        const { data: roleData } = await supabase
          .from("user_roles").select("role")
          .eq("user_id", session.user.id).maybeSingle();

        if (roleData?.role !== "student") { 
          loadHostels(initialFilters); 
          return; 
        }

        const { data: profile } = await supabase
          .from("profiles").select("gender")
          .eq("id", session.user.id).maybeSingle();

        if (profile?.gender) {
          const hostelType = profile.gender === "male" ? "boys" : profile.gender === "female" ? "girls" : "all";
          const genderFilters = { ...initialFilters, hostelType };
          setFilters(genderFilters);
          loadHostels(genderFilters);
        } else {
          loadHostels(initialFilters);
        }
      } catch {
        loadHostels(initialFilters);
      }
    };

    applyGenderFilter();
  }, [searchParams]);

  const loadHostels = useCallback(async (activeFilters?: SearchFilterValues) => {
    setLoading(true);
    try {
      const f = activeFilters || defaultFilters;

      let query = supabase
        .from("hostels")
        .select("*")
        .eq("approved", true)
        .order("created_at", { ascending: false });

      if (f.location.trim()) {
        const loc = f.location.trim().toLowerCase();
        query = query.ilike("city", `%${loc}%`);
      }
      if (f.hostelType && f.hostelType !== "all") {
        query = query.eq("hostel_type", f.hostelType as "boys" | "girls" | "co-ed");
      }
      if (f.priceRange[1] < 50000) query = query.lte("price_per_month", f.priceRange[1]);
      if (f.priceRange[0] > 0) query = query.gte("price_per_month", f.priceRange[0]);
      if (f.minRating[0] > 1) query = query.gte("rating", f.minRating[0]);

      const { data: hostelsData, error: hostelsError } = await query;
      if (hostelsError) throw hostelsError;

      const hostelsWithDetails = await Promise.all(
        (hostelsData || []).map(async (hostel) => {
          const [{ data: imagesData }, { data: facilitiesData }, { data: roomsData }] =
            await Promise.all([
              supabase.from("hostel_images").select("image_url, is_primary")
                .eq("hostel_id", hostel.id).order("is_primary", { ascending: false }),
              supabase.from("hostel_facilities").select("facility").eq("hostel_id", hostel.id),
              supabase.from("rooms").select("rent_per_bed").eq("hostel_id", hostel.id)
                .order("rent_per_bed", { ascending: true }).limit(1).maybeSingle(),
            ]);

          return {
            id: hostel.id,
            name: hostel.name,
            address: hostel.address,
            city: hostel.city,
            price_per_month: hostel.price_per_month,
            rating: hostel.rating,
            approved: hostel.approved,
            images: imagesData || [],
            facilities: facilitiesData?.map((f) => f.facility) || [],
            lowestRentPerBed: roomsData?.rent_per_bed || null,
          };
        })
      );

      let filtered = hostelsWithDetails;
      if (f.selectedFacilities.length > 0) {
        filtered = filtered.filter((h) =>
          f.selectedFacilities.every((fac) =>
            h.facilities.some((hf) => hf.toLowerCase() === fac.toLowerCase())
          )
        );
      }

      setHostels(filtered);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleSearch = () => {
    setHasSearched(true);
    loadHostels(filters);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Mobile filter button */}
      {isMobile && (
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-2 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? <X className="h-4 w-4 mr-1.5" /> : <SlidersHorizontal className="h-4 w-4 mr-1.5" />}
            {showFilters ? "Close Filters" : "Filters"}
          </Button>
        </div>
      )}

      {/* Mobile filters drawer */}
      {isMobile && showFilters && (
        <div className="px-4 py-3 border-b border-border bg-card animate-fade-in">
          <SearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            onSearch={() => { handleSearch(); setShowFilters(false); }}
            loading={loading}
          />
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop: sidebar filters */}
        {!isMobile && (
          <div className="w-[260px] flex-shrink-0 border-r border-border p-4 overflow-y-auto">
            <SearchFilters
              filters={filters}
              onFiltersChange={setFilters}
              onSearch={handleSearch}
              loading={loading}
            />
          </div>
        )}

        {/* Main content - full width listing */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <div className="mb-4">
              <h1 className="text-lg font-bold">
                Available Hostels{" "}
                <span className="text-muted-foreground font-normal text-sm">
                  ({hostels.length})
                </span>
              </h1>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-muted-foreground">Loading hostels...</p>
              </div>
            ) : hostels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <p className="text-muted-foreground">
                  {hasSearched && filters.location.trim() 
                    ? `No hostels found in ${filters.location.trim()}` 
                    : hasSearched 
                      ? "No hostels found matching your criteria." 
                      : "No hostels found"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {hostels.map((hostel) => (
                  <HostelCard
                    key={hostel.id}
                    id={hostel.id}
                    name={hostel.name}
                    location={`${hostel.address}, ${hostel.city}`}
                    price={hostel.lowestRentPerBed ?? hostel.price_per_month}
                    rating={hostel.rating}
                    reviews={0}
                    image={hostel.images[0]?.image_url || ""}
                    facilities={hostel.facilities}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Search;
