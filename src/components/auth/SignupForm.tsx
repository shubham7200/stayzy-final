import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SignupFormProps {
  userType: "student" | "owner";
  onSignupSuccess: () => void;
  disabled?: boolean;
}

const SignupForm = ({ userType, onSignupSuccess, disabled }: SignupFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    gender: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (userType === "student" && !formData.gender) {
      toast({
        title: "Gender required",
        description: "Please select your gender to help us suggest relevant hostels.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const metadata: Record<string, string> = {
        full_name: formData.fullName,
        role: userType,
      };
      if (userType === "student" && formData.gender) {
        metadata.gender = formData.gender;
      }

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/verified`,
        },
      });

      if (error) throw error;

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account. Redirecting to login...",
      });

      setFormData({ fullName: "", email: formData.email, password: "", gender: "" });
      setTimeout(() => {
        onSignupSuccess();
      }, 1500);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Unable to create account";
      toast({
        title: "Signup failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Full Name</Label>
        <Input
          id="signup-name"
          name="fullName"
          type="text"
          placeholder="John Doe"
          value={formData.fullName}
          onChange={handleInputChange}
          disabled={loading || disabled}
          required
        />
      </div>
      {userType === "student" && (
        <div className="space-y-2">
          <Label htmlFor="signup-gender">Gender</Label>
          <Select
            value={formData.gender}
            onValueChange={(v) => setFormData({ ...formData, gender: v })}
            disabled={loading || disabled}
          >
            <SelectTrigger id="signup-gender" className="h-11">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
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
        <Label htmlFor="signup-password">Password (min 8 characters)</Label>
        <Input
          id="signup-password"
          name="password"
          type="password"
          placeholder="••••••••"
          minLength={8}
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
            Creating account...
          </>
        ) : (
          `Sign Up as ${userType === "student" ? "Student" : "Owner"}`
        )}
      </Button>
    </form>
  );
};

export default SignupForm;
