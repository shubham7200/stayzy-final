import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRoleValidation } from "@/hooks/useRoleValidation";

interface EmailLoginFormProps {
  userType: "student" | "owner";
  disabled?: boolean;
}

const EmailLoginForm = ({ userType, disabled }: EmailLoginFormProps) => {
  const { toast } = useToast();
  const { validateRoleAndNavigate } = useRoleValidation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error("No user data returned");
      }

      // Validate role before allowing navigation
      await validateRoleAndNavigate(data.user.id, userType);
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          placeholder="your@email.com"
          value={formData.email}
          onChange={handleInputChange}
          disabled={loading || disabled}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={handleInputChange}
          disabled={loading || disabled}
          required
        />
      </div>
      <Button
        type="submit"
        variant="hero"
        className="w-full"
        size="lg"
        disabled={loading || disabled}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Logging in...
          </>
        ) : (
          `Login as ${userType === "student" ? "Student" : "Owner"}`
        )}
      </Button>
    </form>
  );
};

export default EmailLoginForm;
