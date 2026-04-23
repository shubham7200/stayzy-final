import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, LogOut, User, ClipboardList, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

const Navbar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>("");
  const isMobile = useIsMobile();

  useEffect(() => {
    const loadUserRole = async (userId: string) => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();
      
      if (data) setRole(data.role);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserRole(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserRole(session.user.id);
      } else {
        setRole("");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <Link
        to="/"
        className="flex items-center gap-2 text-foreground hover:text-primary transition-smooth px-3 py-2 rounded-md hover:bg-secondary/50"
        onClick={onNavigate}
      >
        <span className="text-sm font-medium">Home</span>
      </Link>
      {user ? (
        <>
          <Link to="/profile" onClick={onNavigate}>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <User className="h-4 w-4" />
              Profile
            </Button>
          </Link>
          {role === "student" && (
            <Link to="/my-bookings" onClick={onNavigate}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <ClipboardList className="h-4 w-4" />
                My Bookings
              </Button>
            </Link>
          )}
          {role === "owner" && (
            <Link to="/manage-hostels" onClick={onNavigate}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Building2 className="h-4 w-4" />
                My Hostels
              </Button>
            </Link>
          )}
          {role === "admin" && (
            <Link to="/admin" onClick={onNavigate}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Building2 className="h-4 w-4" />
                Admin Panel
              </Button>
            </Link>
          )}
          <Button onClick={() => { handleLogout(); onNavigate?.(); }} variant="outline" className="w-full justify-start gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </>
      ) : (
        <Link to="/auth" onClick={onNavigate}>
          <Button className="w-full rounded-full px-6">
            Sign In
          </Button>
        </Link>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 transition-smooth hover:opacity-80">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-primary">Stayzy</span>
          </Link>

          {/* Desktop nav */}
          {!isMobile ? (
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-smooth">
                <span className="text-sm font-medium">Home</span>
              </Link>
              {user ? (
                <>
                  <Link to="/profile">
                    <Button variant="ghost" className="gap-2">
                      <User className="h-4 w-4" />
                      Profile
                    </Button>
                  </Link>
                  {role === "student" && (
                    <Link to="/my-bookings">
                      <Button variant="ghost" className="gap-2">
                        <ClipboardList className="h-4 w-4" />
                        My Bookings
                      </Button>
                    </Link>
                  )}
                  {role === "owner" && (
                    <Link to="/manage-hostels">
                      <Button variant="ghost" className="gap-2">
                        <Building2 className="h-4 w-4" />
                        My Hostels
                      </Button>
                    </Link>
                  )}
                  {role === "admin" && (
                    <Link to="/admin">
                      <Button variant="ghost" className="gap-2">
                        <Building2 className="h-4 w-4" />
                        Admin Panel
                      </Button>
                    </Link>
                  )}
                  <Button onClick={handleLogout} variant="outline" className="gap-2">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <Link to="/auth">
                  <Button className="rounded-full px-6">Sign In</Button>
                </Link>
              )}
            </div>
          ) : (
            /* Mobile hamburger */
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Stayzy
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-1 mt-6">
                  <NavLinks />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
