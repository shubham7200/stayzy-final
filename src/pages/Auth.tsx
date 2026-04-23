import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, User, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import EmailLoginForm from "@/components/auth/EmailLoginForm";
import SignupForm from "@/components/auth/SignupForm";

const Auth = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState<"student" | "owner">("student");
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  // Redirect if already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();
  }, [navigate]);

  const handleSignupSuccess = () => {
    setActiveTab("login");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-smooth">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <Card className="p-8 shadow-lifted">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <Building2 className="h-10 w-10 text-primary" />
              <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Stayzy
              </span>
            </Link>
            <p className="text-muted-foreground">Find your perfect student home</p>
          </div>

          {/* User Type Selection */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Button
              variant={userType === "student" ? "hero" : "outline"}
              onClick={() => setUserType("student")}
              className="gap-2"
            >
              <User className="h-4 w-4" />
              Student
            </Button>
            <Button
              variant={userType === "owner" ? "hero" : "outline"}
              onClick={() => setUserType("owner")}
              className="gap-2"
            >
              <Building2 className="h-4 w-4" />
              Owner
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <EmailLoginForm userType={userType} />
            </TabsContent>

            <TabsContent value="signup">
              <SignupForm 
                userType={userType} 
                onSignupSuccess={handleSignupSuccess} 
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
