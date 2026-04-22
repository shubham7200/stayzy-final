import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Verified = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      try {
        if (!supabase || !supabase.auth) {
          console.error("[Verified] Supabase client not initialized");
          if (!cancelled) setStatus("error");
          return;
        }

        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("[Verified] Session error:", error.message);
          if (!cancelled) setStatus("error");
          return;
        }

        if (!cancelled) {
          setStatus(data?.session ? "success" : "error");
        }
      } catch (err) {
        console.error("[Verified] Unexpected error:", err);
        if (!cancelled) setStatus("error");
      }
    };

    // Small delay to allow Supabase to process the token from the URL
    const timer = setTimeout(checkSession, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-lifted text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Verifying your email…</h1>
            <p className="text-muted-foreground">Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Email Verified Successfully</h1>
            <p className="text-muted-foreground">Your account is now active. You can now login.</p>
            <Button variant="hero" size="lg" className="w-full" onClick={() => navigate("/auth")}>
              Go to Login
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Verification Failed</h1>
            <p className="text-muted-foreground">Invalid or expired verification link.</p>
            <Button variant="outline" size="lg" className="w-full" onClick={() => navigate("/auth")}>
              Go to Login
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};

export default Verified;
