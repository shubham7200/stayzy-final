import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User, Phone, Mail, Camera, Loader2, LogOut, Lock,
  Pencil, Building2, ShieldCheck, GraduationCap, MapPin,
  CheckCircle2, AlertCircle, Settings
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    avatar_url: "",
  });
  const [editProfile, setEditProfile] = useState({ full_name: "", phone: "" });
  const [role, setRole] = useState<string>("");
  const [hostelCount, setHostelCount] = useState(0);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate("/auth"); return; }
        setUser(session.user);

        const [profileRes, roleRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle(),
        ]);

        if (profileRes.error) throw profileRes.error;
        if (profileRes.data) {
          const p = {
            full_name: profileRes.data.full_name || "",
            phone: profileRes.data.phone || "",
            avatar_url: profileRes.data.avatar_url || "",
          };
          setProfile(p);
          setEditProfile({ full_name: p.full_name, phone: p.phone });
        }

        const userRole = roleRes.data?.role || "";
        setRole(userRole);

        if (userRole === "owner") {
          const { count } = await supabase
            .from("hostels")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", session.user.id);
          setHostelCount(count || 0);
        }
      } catch (error: any) {
        toast({ title: "Error loading profile", description: error.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [navigate, toast]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file type", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 2MB allowed.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${user.id}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      if (updateError) throw updateError;
      setProfile({ ...profile, avatar_url: publicUrl });
      toast({ title: "Profile picture updated!" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ full_name: editProfile.full_name, phone: editProfile.phone }).eq("id", user.id);
      if (error) throw error;
      setProfile({ ...profile, full_name: editProfile.full_name, phone: editProfile.phone });
      setEditing(false);
      toast({ title: "Profile updated!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getInitials = () => {
    if (!profile.full_name) return "U";
    return profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getRoleBadge = () => {
    switch (role) {
      case "admin":
        return <Badge className="bg-[hsl(0,84%,60%)] text-[hsl(0,0%,100%)] text-sm px-3 py-1 gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Admin</Badge>;
      case "owner":
        return <Badge className="bg-[hsl(243,75%,59%)] text-[hsl(0,0%,100%)] text-sm px-3 py-1 gap-1.5"><Building2 className="h-3.5 w-3.5" />Owner</Badge>;
      default:
        return <Badge className="bg-[hsl(160,60%,45%)] text-[hsl(0,0%,100%)] text-sm px-3 py-1 gap-1.5"><GraduationCap className="h-3.5 w-3.5" />Student</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Profile Header Card */}
          <Card className="overflow-hidden shadow-lifted">
            <div className="h-28 gradient-hero" />
            <div className="px-6 pb-6 relative">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-14">
                {/* Avatar */}
                <div className="relative group">
                  <Avatar className="h-28 w-28 border-4 border-card shadow-soft">
                    {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} />}
                    <AvatarFallback className="text-3xl gradient-hero text-primary-foreground">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <input type="file" id="avatar-upload" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                  <button
                    type="button"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    disabled={uploading}
                    className="absolute inset-0 rounded-full bg-foreground/0 group-hover:bg-foreground/40 flex items-center justify-center transition-smooth cursor-pointer"
                  >
                    {uploading ? (
                      <Loader2 className="h-6 w-6 text-primary-foreground animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-primary-foreground opacity-0 group-hover:opacity-100 transition-smooth" />
                    )}
                  </button>
                </div>

                {/* Name & Info */}
                <div className="flex-1 text-center sm:text-left sm:pb-1">
                  <h1 className="text-2xl font-bold text-foreground">{profile.full_name || "User"}</h1>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1.5">
                    {getRoleBadge()}
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {user?.email}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid md:grid-cols-5 gap-6">
            {/* Left Column - Role Info */}
            <div className="md:col-span-2 space-y-6">
              {/* Role Info Card */}
              <Card className="p-5 shadow-soft space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Role Details
                </h3>
                <Separator />

                {role === "student" && (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                      <div><span className="text-foreground font-medium">Role:</span> Student</div>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <div><span className="text-foreground font-medium">Looking for:</span> Hostel accommodation</div>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-[hsl(160,60%,45%)] shrink-0" />
                      <div><span className="text-foreground font-medium">Status:</span> Active</div>
                    </div>
                  </div>
                )}

                {role === "owner" && (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Building2 className="h-4 w-4 text-primary shrink-0" />
                      <div><span className="text-foreground font-medium">Hostels Listed:</span> {hostelCount}</div>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-[hsl(160,60%,45%)] shrink-0" />
                      <div><span className="text-foreground font-medium">Verified:</span> Yes</div>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Phone className="h-4 w-4 text-primary shrink-0" />
                      <div><span className="text-foreground font-medium">Contact:</span> {profile.phone || "Not set"}</div>
                    </div>
                  </div>
                )}

                {role === "admin" && (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <ShieldCheck className="h-4 w-4 text-destructive shrink-0" />
                      <div><span className="text-foreground font-medium">Access:</span> Full System</div>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Settings className="h-4 w-4 text-primary shrink-0" />
                      <div className="text-xs text-muted-foreground">
                        You have administrative control over all platform resources.
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Actions Card */}
              <Card className="p-5 shadow-soft space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  Quick Actions
                </h3>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit Profile
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => toast({ title: "Coming soon", description: "Password change will be available soon." })}
                >
                  <Lock className="h-4 w-4" />
                  Change Password
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </Card>
            </div>

            {/* Right Column - Personal Info */}
            <div className="md:col-span-3">
              <Card className="p-6 shadow-soft">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Personal Information
                  </h3>
                  {!editing && (
                    <Button variant="ghost" size="sm" className="gap-1.5 text-primary" onClick={() => { setEditProfile({ full_name: profile.full_name, phone: profile.phone }); setEditing(true); }}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  )}
                </div>
                <Separator className="mb-5" />

                {editing ? (
                  <form onSubmit={handleSave} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={editProfile.full_name}
                        onChange={(e) => setEditProfile({ ...editProfile, full_name: e.target.value })}
                        disabled={saving}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Email cannot be changed</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={editProfile.phone}
                        onChange={(e) => setEditProfile({ ...editProfile, phone: e.target.value })}
                        disabled={saving}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input value={role.charAt(0).toUpperCase() + role.slice(1)} disabled className="bg-muted capitalize" />
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Role cannot be changed</p>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button type="submit" variant="hero" disabled={saving}>
                        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-5">
                    <InfoRow icon={<User className="h-4 w-4 text-primary" />} label="Full Name" value={profile.full_name || "Not set"} />
                    <InfoRow icon={<Mail className="h-4 w-4 text-primary" />} label="Email" value={user?.email || ""} />
                    <InfoRow icon={<Phone className="h-4 w-4 text-primary" />} label="Phone" value={profile.phone || "Not set"} />
                    <InfoRow icon={<ShieldCheck className="h-4 w-4 text-primary" />} label="Role" value={role.charAt(0).toUpperCase() + role.slice(1)} />
                  </div>
                )}
              </Card>
          </div>

          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 shrink-0">{icon}</div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  </div>
);

export default Profile;
