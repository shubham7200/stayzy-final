import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import ManageHostels from "./pages/ManageHostels";
import AddHostel from "./pages/AddHostel";
import EditHostel from "./pages/EditHostel";
import HostelDetails from "./pages/HostelDetails";
import Admin from "./pages/Admin";
import MyBookings from "./pages/MyBookings";
import EmailConfirmation from "./pages/EmailConfirmation";
import Verified from "./pages/Verified";
import NotFound from "./pages/NotFound";
import BuddyChatbot from "./components/BuddyChatbot";
import SplashScreen from "./components/SplashScreen";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      {!showSplash && (
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<Search />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/manage-hostels" element={<ManageHostels />} />
                <Route path="/add-hostel" element={<AddHostel />} />
                <Route path="/edit-hostel/:id" element={<EditHostel />} />
                <Route path="/hostel/:id" element={<HostelDetails />} />
                <Route path="/my-bookings" element={<MyBookings />} />
                <Route path="/email-confirmation" element={<EmailConfirmation />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/verified" element={<Verified />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            <BuddyChatbot />
          </TooltipProvider>
        </QueryClientProvider>
      )}
    </>
  );
};

export default App;
