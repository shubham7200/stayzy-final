import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, MapPin, Star, ArrowRight, Check, XIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import buddyIcon from "@/assets/buddy-icon.png";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type Facilities = {
  wifi?: boolean;
  ac?: boolean;
  food?: boolean;
  laundry?: boolean;
  parking?: boolean;
};

type HostelData = {
  id: string;
  name: string;
  city: string;
  price_per_month: number;
  hostel_type: string;
  rating: number | null;
  available_rooms: number | null;
};

type CompareHostelData = HostelData & {
  deposit?: number | null;
  facilities?: Facilities | null;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  hostels?: HostelData[] | null;
  compare?: CompareHostelData[] | null;
};

const typeColors: Record<string, string> = {
  boys: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  girls: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "co-ed": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

const FacilityIcon = ({ value }: { value?: boolean }) => {
  if (value === true) return <Check className="h-3.5 w-3.5 text-emerald-500" />;
  if (value === false) return <XIcon className="h-3.5 w-3.5 text-red-400" />;
  return <span className="text-[10px] text-muted-foreground">N/A</span>;
};

const HostelCards = ({ hostels }: { hostels: HostelData[] }) => (
  <div className="flex flex-col gap-2 mt-2">
    {hostels.map((h) => (
      <div key={h.id} className="bg-card border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-foreground truncate">{h.name}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{h.city}</span>
            </div>
          </div>
          <Badge className={`text-[10px] px-1.5 py-0.5 shrink-0 ${typeColors[h.hostel_type] || ""}`}>
            {h.hostel_type}
          </Badge>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <span className="text-primary font-bold text-sm">₹{h.price_per_month}</span>
            <span className="text-[10px] text-muted-foreground">/month</span>
            {h.rating && (
              <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-accent text-accent" />
                {h.rating}
              </div>
            )}
          </div>
          <button
            onClick={() => window.location.href = `/hostel/${h.id}`}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    ))}
  </div>
);

const FACILITY_LABELS: { key: keyof Facilities; label: string }[] = [
  { key: "wifi", label: "WiFi" },
  { key: "ac", label: "AC" },
  { key: "food", label: "Food" },
  { key: "laundry", label: "Laundry" },
  { key: "parking", label: "Parking" },
];

const CompareTable = ({ hostels }: { hostels: CompareHostelData[] }) => {
  // Find cheapest price for highlighting
  const minPrice = Math.min(...hostels.map((h) => h.price_per_month));

  return (
    <div className="overflow-x-auto mt-2 rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left p-2 font-medium text-muted-foreground">Feature</th>
            {hostels.map((h) => (
              <th key={h.id} className="text-left p-2 font-semibold text-foreground">{h.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-border">
            <td className="p-2 text-muted-foreground">City</td>
            {hostels.map((h) => <td key={h.id} className="p-2">{h.city || "N/A"}</td>)}
          </tr>
          <tr className="border-t border-border">
            <td className="p-2 text-muted-foreground">Price</td>
            {hostels.map((h) => (
              <td key={h.id} className={`p-2 font-semibold ${h.price_per_month === minPrice ? "text-emerald-600 dark:text-emerald-400" : "text-primary"}`}>
                ₹{h.price_per_month}
                {h.price_per_month === minPrice && hostels.length > 1 && (
                  <span className="ml-1 text-[9px] font-normal text-emerald-500">★ Cheapest</span>
                )}
              </td>
            ))}
          </tr>
          <tr className="border-t border-border">
            <td className="p-2 text-muted-foreground">Deposit</td>
            {hostels.map((h) => (
              <td key={h.id} className="p-2">
                {h.deposit != null && h.deposit > 0 ? `₹${h.deposit}` : h.deposit === 0 ? <span className="text-emerald-500 font-medium">No Deposit</span> : "N/A"}
              </td>
            ))}
          </tr>
          <tr className="border-t border-border">
            <td className="p-2 text-muted-foreground">Type</td>
            {hostels.map((h) => <td key={h.id} className="p-2 capitalize">{h.hostel_type || "N/A"}</td>)}
          </tr>
          <tr className="border-t border-border">
            <td className="p-2 text-muted-foreground">Rating</td>
            {hostels.map((h) => (
              <td key={h.id} className="p-2">
                {h.rating ? <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-accent text-accent" />{h.rating}</span> : "N/A"}
              </td>
            ))}
          </tr>
          <tr className="border-t border-border">
            <td className="p-2 text-muted-foreground">Beds</td>
            {hostels.map((h) => <td key={h.id} className="p-2">{h.available_rooms ?? "N/A"}</td>)}
          </tr>
          {FACILITY_LABELS.map(({ key, label }) => (
            <tr key={key} className="border-t border-border">
              <td className="p-2 text-muted-foreground">{label}</td>
              {hostels.map((h) => (
                <td key={h.id} className="p-2">
                  <FacilityIcon value={h.facilities?.[key]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const BuddyChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi there! 👋 I'm Buddy, your Stayzy assistant. Ask me about hostels, budget, location — I'm here to help!" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("buddy-chat", {
        body: { message: trimmed },
      });
      if (error) throw error;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "I couldn't generate a response. Please try again.",
          hostels: data.hostels || null,
          compare: data.compare || null,
        },
      ]);
    } catch (err) {
      console.error("Buddy chat error:", err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Please try again. 😔" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isHovered && !isOpen && (
        <div className="fixed bottom-[85px] right-3 sm:bottom-[95px] sm:right-4 z-[9998] animate-fade-in pointer-events-none">
          <div className="bg-foreground text-background text-xs sm:text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            Hi, I'm Buddy 👋 Need help?
            <div className="absolute -bottom-1.5 right-5 w-3 h-3 bg-foreground rotate-45" />
          </div>
        </div>
      )}

      <button
        onClick={() => { setIsOpen(!isOpen); setIsHovered(false); }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed bottom-5 right-5 z-[9999] p-0 border-0 bg-transparent cursor-pointer transition-transform duration-300 focus:outline-none ${isHovered && !isOpen ? "scale-110" : ""} ${isOpen ? "" : "buddy-float"}`}
        style={{ background: "none", outline: "none" }}
        aria-label="Open chatbot"
      >
        <div className="w-[54px] h-[54px] sm:w-[64px] sm:h-[64px] rounded-full bg-white shadow-lg flex items-center justify-center buddy-glow">
          <img src={buddyIcon} alt="Buddy Chatbot" className="w-[36px] h-[36px] sm:w-[42px] sm:h-[42px] object-contain" />
        </div>
      </button>

      {isOpen && (
        <div className="fixed bottom-[80px] right-5 sm:bottom-[90px] sm:right-5 z-[9998] w-[calc(100vw-40px)] max-w-[380px] animate-scale-in">
          <div onClick={() => inputRef.current?.focus()} className="bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ height: "480px" }}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-primary/5">
              <img src={buddyIcon} alt="Buddy" className="w-9 h-9 object-contain" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground">Buddy</div>
                <div className="text-xs text-muted-foreground">Stayzy Assistant</div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-muted transition-colors" aria-label="Close chat">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[90%] px-3 py-2 rounded-xl text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <>
                        <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        {msg.hostels && msg.hostels.length > 0 && <HostelCards hostels={msg.hostels} />}
                        {msg.compare && msg.compare.length > 0 && <CompareTable hostels={msg.compare} />}
                      </>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted text-foreground rounded-xl rounded-bl-sm px-3 py-2 text-sm flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Buddy is typing…
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-border px-3 py-2 flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask about hostels..."
                disabled={isLoading}
                className="flex-1 bg-muted/50 border-0 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-primary text-primary-foreground rounded-lg p-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BuddyChatbot;
