import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Wifi, Coffee, Users, Utensils, Tv, Dumbbell, Car, Wind, Waves, Lock, BadgeCheck } from "lucide-react";

interface HostelCardProps {
  id?: string | number;
  name: string;
  location: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  facilities: string[];
  lowestRentPerBed?: number | null;
  isVerified?: boolean;
}

const facilityIcons: Record<string, any> = {
  wifi: Wifi,
  kitchen: Utensils,
  "common room": Users,
  "common area": Users,
  gym: Dumbbell,
  parking: Car,
  ac: Wind,
  "air conditioning": Wind,
  laundry: Waves,
  security: Lock,
  tv: Tv,
  cafe: Coffee,
  restaurant: Utensils,
};

const HostelCard = ({ id, name, location, price, rating, reviews, image, facilities, lowestRentPerBed, isVerified = true }: HostelCardProps) => {
  const navigate = useNavigate();
  const displayPrice = lowestRentPerBed ?? price;
  const priceLabel = lowestRentPerBed ? "/bed" : "/month";

  const placeholderImage = "/placeholder.svg";
  
  return (
    <Card className="overflow-hidden hover-lift cursor-pointer group" onClick={() => id && navigate(`/hostel/${id}`)}>
      <div className="relative h-48 overflow-hidden bg-muted">
        <img 
          src={image || placeholderImage} 
          alt={name} 
          className="w-full h-full object-cover transition-smooth group-hover:scale-110"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = placeholderImage;
          }}
        />
        <div className="absolute top-3 right-3 flex gap-2">
          {isVerified && (
            <Badge className="bg-emerald-500 text-white shadow-lg flex items-center gap-1">
              <BadgeCheck className="h-3.5 w-3.5" />
              Verified
            </Badge>
          )}
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-lg mb-1">{name}</h3>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <MapPin className="h-3.5 w-3.5" />
              <span>{location}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 mb-1">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="font-semibold">{rating}</span>
            </div>
            <span className="text-xs text-muted-foreground">({reviews} reviews)</span>
          </div>
        </div>

        <div className="flex gap-2 mb-3 flex-wrap">
          {facilities.slice(0, 4).map((facility) => {
            const Icon = facilityIcons[facility.toLowerCase()] || Wifi;
            return (
              <div key={facility} className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                <Icon className="h-3.5 w-3.5" />
                <span className="capitalize">{facility}</span>
              </div>
            );
          })}
          {facilities.length > 4 && (
            <div className="flex items-center text-xs text-muted-foreground">
              +{facilities.length - 4} more
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div>
            {lowestRentPerBed && <span className="text-xs text-muted-foreground block mb-0.5">From</span>}
            <span className="text-2xl font-bold text-primary">₹{displayPrice}</span>
            <span className="text-sm text-muted-foreground">{priceLabel}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              id && navigate(`/hostel/${id}`);
            }}
          >
            View Details
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default HostelCard;
