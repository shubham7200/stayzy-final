import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export const useRoleValidation = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateRoleAndNavigate = async (
    userId: string,
    selectedRole: "student" | "owner"
  ): Promise<boolean> => {
    try {
      // Fetch the user's actual role from the database
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (roleError) {
        console.error("Error fetching user role:", roleError);
        await supabase.auth.signOut();
        toast({
          title: "Authentication Error",
          description: "Unable to verify your account role. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      // If no role found in database
      if (!roleData) {
        await supabase.auth.signOut();
        toast({
          title: "Account Not Found",
          description: "Your account role is not configured. Please contact support.",
          variant: "destructive",
        });
        return false;
      }

      const actualRole = roleData.role as AppRole;

      // Check if user is admin - admins can log in regardless of selection
      if (actualRole === "admin") {
        toast({
          title: "Welcome back, Admin!",
          description: "Redirecting to admin dashboard...",
        });
        navigate("/admin");
        return true;
      }

      // Validate that selected role matches actual role
      if (actualRole !== selectedRole) {
        // Sign out immediately - role mismatch
        await supabase.auth.signOut();
        
        const roleLabel = actualRole === "owner" ? "Owner" : "Student";
        toast({
          title: "Role Mismatch",
          description: `You are registered as a ${roleLabel}. Please log in using the ${roleLabel} option.`,
          variant: "destructive",
        });
        return false;
      }

      // Role matches - allow navigation
      toast({
        title: "Welcome back!",
        description: "Successfully logged in",
      });

      if (actualRole === "owner") {
        navigate("/manage-hostels");
      } else {
        navigate("/");
      }
      
      return true;
    } catch (error: any) {
      console.error("Role validation error:", error);
      await supabase.auth.signOut();
      toast({
        title: "Authentication Error",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  return { validateRoleAndNavigate };
};
