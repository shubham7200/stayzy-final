import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

const EmailConfirmation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "localhost">("loading");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      if (token_hash && type) {
        console.log("[EmailConfirmation] Verifying with token_hash, type:", type);
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as "signup" | "email",
        });
        if (error) console.error("[EmailConfirmation] Verification error:", error.message);
        setStatus(error ? "error" : "success");
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("[EmailConfirmation] Session check:", session ? "found" : "none");

        if (session) {
          setStatus("success");
        } else if (isLocalhost) {
          console.warn("[EmailConfirmation] Running on localhost — email verification links may not work correctly.");
          setStatus("localhost");
        } else {
          setStatus("error");
        }
      }

      setTimeout(() => setVisible(true), 50);
    };

    verifyEmail();
  }, [searchParams]);

  if (status === "loading") return null;

  const content = {
    success: {
      icon: <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />,
      title: "Email Verified Successfully",
      description: "Your account has been confirmed. You can now log in to Stayzy.",
    },
    error: {
      icon: <XCircle className="mx-auto h-16 w-16 text-destructive mb-4" />,
      title: "Verification Failed",
      description: "This link is invalid or expired.",
    },
    localhost: {
      icon: <AlertTriangle className="mx-auto h-16 w-16 text-yellow-500 mb-4" />,
      title: "Local Development Detected",
      description: "Email verification links won't work on localhost. Deploy the app or use a live URL to test the full verification flow.",
    },
  }[status];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card
        className="w-full max-w-sm p-8 text-center shadow-lifted"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
        }}
      >
        {content.icon}
        <h1 className="text-xl font-semibold text-foreground mb-2">{content.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{content.description}</p>
        <Button variant="hero" className="w-full" onClick={() => navigate("/auth")}>
          Go to Login
        </Button>
      </Card>
    </div>
  );
};

export default EmailConfirmation;
