import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HostelCard from "@/components/HostelCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, MapPin, Shield, Star, Users, CheckCircle, TrendingUp, Award, Clock, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Hostel {
  id: string;
  name: string;
  address: string;
  city: string;
  price_per_month: number;
  rating: number;
  approved: boolean;
  hostel_images: { image_url: string; is_primary: boolean }[];
  hostel_facilities: { facility: string }[];
  lowestRentPerBed?: number | null;
}

const Home = () => {
  const navigate = useNavigate();
  const [searchLocation, setSearchLocation] = useState("");
  const [statsVisible, setStatsVisible] = useState(false);
  const [featuredHostels, setFeaturedHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    hostels: 0,
    students: 0,
    rating: 0,
  });

  useEffect(() => {
    const timer = setTimeout(() => setStatsVisible(true), 100);
    loadFeaturedHostels();
    loadStats();
    return () => clearTimeout(timer);
  }, []);

  const loadStats = async () => {
    try {
      // Get total hostels count
      const { count: hostelsCount } = await supabase
        .from("hostels")
        .select("*", { count: "exact", head: true });

      // Get total bookings count as a proxy for active students
      // Note: We can't query user_roles directly due to RLS restrictions
      const { count: bookingsCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .in("status", ["confirmed", "pending"]);

      // Get average rating
      const { data: ratingsData } = await supabase
        .from("hostels")
        .select("rating");

      const avgRating = ratingsData && ratingsData.length > 0
        ? ratingsData.reduce((sum, h) => sum + Number(h.rating), 0) / ratingsData.length
        : 0;

      setStats({
        hostels: hostelsCount || 0,
        students: bookingsCount || 0,
        rating: avgRating,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadFeaturedHostels = async () => {
    try {
      const { data, error } = await supabase
        .from("hostels")
        .select(`
          id,
          name,
          address,
          city,
          price_per_month,
          rating,
          approved,
          hostel_images(image_url, is_primary),
          hostel_facilities(facility)
        `)
        .eq('approved', true)
        .order('rating', { ascending: false })
        .limit(3);

      if (error) throw error;

      // Fetch lowest rent per bed for each hostel
      const hostelsWithRooms = await Promise.all(
        (data || []).map(async (hostel) => {
          const { data: roomsData } = await supabase
            .from("rooms")
            .select("rent_per_bed")
            .eq("hostel_id", hostel.id)
            .order("rent_per_bed", { ascending: true })
            .limit(1)
            .maybeSingle();

          return {
            ...hostel,
            lowestRentPerBed: roomsData?.rent_per_bed || null,
          };
        })
      );

      setFeaturedHostels(hostelsWithRooms);
    } catch (error) {
      console.error("Error loading hostels:", error);
      toast.error("Failed to load hostels");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchLocation.trim()) {
      navigate(`/search?location=${encodeURIComponent(searchLocation)}`);
    } else {
      navigate("/search");
    }
  };

  const statsData = [
    { label: "Active Hostels", value: stats.hostels.toString(), icon: TrendingUp },
    { label: "Active Bookings", value: stats.students.toString(), icon: Users },
    { label: "Average Rating", value: stats.rating > 0 ? `${stats.rating.toFixed(1)}/5` : "0/5", icon: Star },
  ];

  const steps = [
    {
      icon: Search,
      title: "Search & Filter",
      description: "Find hostels using smart filters for location, price, and facilities",
    },
    {
      icon: Star,
      title: "Compare & Review",
      description: "Read authentic reviews and compare options side-by-side",
    },
    {
      icon: CheckCircle,
      title: "Book Instantly",
      description: "Secure your room with instant booking and verified payments",
    },
  ];


  const testimonials = [
    {
      name: "Priya Sharma",
      role: "Engineering Student",
      content: "Found my perfect hostel in just 2 days! The verified listings and honest reviews made the decision so easy.",
      rating: 5,
    },
    {
      name: "Rahul Kumar",
      role: "MBA Student",
      content: "The filter options are incredibly detailed. I could find exactly what I needed within my budget.",
      rating: 5,
    },
    {
      name: "Ananya Desai",
      role: "Medical Student",
      content: "Safe, verified hostels with real student reviews. Stayzy made my relocation stress-free!",
      rating: 5,
    },
  ];


  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero min-h-[90vh] flex items-center">
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJncmlkIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCAwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
              Find Your Perfect Student Home
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
              Discover comfortable, affordable hostels near your campus
            </p>

            {/* Search Bar */}
            <div className="max-w-3xl mx-auto animate-scale-in">
              <div className="bg-white rounded-2xl shadow-2xl p-3 flex flex-col sm:flex-row gap-3">
                <div className="flex-1 flex items-center gap-3 px-4 bg-background/5 rounded-xl">
                  <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <Input
                    placeholder="Enter location..."
                    className="border-0 focus-visible:ring-0 text-base bg-transparent"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <Button 
                  size="lg" 
                  onClick={handleSearch}
                  className="rounded-xl px-8 text-base font-semibold hover-scale"
                >
                  <Search className="h-5 w-5" />
                  Search
                </Button>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>100% Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                <span>Trusted by 50k+ Students</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-y">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {statsData.map((stat, index) => (
              <div
                key={stat.label}
                className={`text-center space-y-2 ${
                  statsVisible ? "animate-fade-in" : "opacity-0"
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Finding your perfect student home is just three simple steps away
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <Card
                key={step.title}
                className="p-8 text-center hover-lift relative overflow-hidden group"
              >
                <div className="absolute top-4 right-4 text-6xl font-bold text-primary/5">
                  {index + 1}
                </div>
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-hero mb-6 group-hover:scale-110 transition-transform">
                    <step.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-xl mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Hostels Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Popular Hostels</h2>
              <p className="text-muted-foreground text-lg">
                Top-rated accommodations loved by students
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/search")} className="hidden md:flex">
              View All
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                Loading hostels...
              </div>
            ) : featuredHostels.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No hostels available yet. Be the first to list your hostel!
              </div>
            ) : (
              featuredHostels.map((hostel, index) => {
                const primaryImage = hostel.hostel_images.find(img => img.is_primary)?.image_url || 
                                    hostel.hostel_images[0]?.image_url || '';
                const facilities = hostel.hostel_facilities.map(f => f.facility);
                
                return (
                  <div
                    key={hostel.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <HostelCard 
                      id={hostel.id}
                      name={hostel.name}
                      location={`${hostel.address}, ${hostel.city}`}
                      price={hostel.price_per_month}
                      rating={Number(hostel.rating)}
                      reviews={0}
                      image={primaryImage}
                      facilities={facilities}
                      lowestRentPerBed={hostel.lowestRentPerBed}
                      isVerified={hostel.approved}
                    />
                  </div>
                );
              })
            )}
          </div>

          <div className="text-center mt-8 md:hidden">
            <Button variant="outline" onClick={() => navigate("/search")}>
              View All Hostels
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Students Say</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Real experiences from students who found their home through Stayzy
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card
                key={testimonial.name}
                className="p-6 hover-lift animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 italic">"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="gradient-hero p-12 md:p-16 text-center text-white shadow-glow-primary overflow-hidden relative">
            <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJncmlkIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCAwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]"></div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Ready to Find Your Home?</h2>
              <p className="text-lg md:text-xl opacity-90 mb-8 max-w-2xl mx-auto">
                Join thousands of students who have found their perfect accommodation through Stayzy
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => navigate("/search")}
                  className="bg-white text-primary hover:bg-white/90 font-semibold hover-scale"
                >
                  Browse Hostels
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 font-semibold"
                  onClick={() => navigate("/auth")}
                >
                  List Your Property
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Contact Us Section */}
      <section className="py-10 bg-muted/40 border-t">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="text-base font-semibold text-foreground">Contact Us</h2>
          <p className="text-xs text-muted-foreground mt-1 mb-6">Need help? Our team is here for you.</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            <a href="mailto:stayzy4u@gmail.com" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
              <Mail className="h-4 w-4" />
              <span>stayzy4u@gmail.com</span>
            </a>
            <a href="tel:+919730837255" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
              <Phone className="h-4 w-4" />
              <span>+91 9730837255</span>
            </a>
            <a href="https://www.google.com/maps/search/?api=1&query=Kolhapur+Maharashtra+India" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
              <MapPin className="h-4 w-4" />
              <span>Kolhapur, Maharashtra</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-3 border-t bg-foreground">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>© 2026 Stayzy. All rights reserved.</p>
            <div className="flex items-center gap-3">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <span>·</span>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <span>·</span>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors" aria-label="Instagram">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors" aria-label="X">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
