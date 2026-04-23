import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message string is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: hostels } = await supabaseAdmin
      .from("hostels")
      .select("id, name, city, address, hostel_type, price_per_month, available_rooms, rating, description")
      .eq("approved", true);

    const { data: rooms } = await supabaseAdmin
      .from("rooms")
      .select("hostel_id, room_no, sharing_type, beds_available, rent_per_bed, balcony, attached_bath, floor, deposit_amount");

    const { data: facilities } = await supabaseAdmin
      .from("hostel_facilities")
      .select("hostel_id, facility");

    // Build facilities map per hostel
    const facilityMap = new Map<string, string[]>();
    for (const f of facilities || []) {
      if (!facilityMap.has(f.hostel_id)) facilityMap.set(f.hostel_id, []);
      facilityMap.get(f.hostel_id)!.push(f.facility.toLowerCase());
    }

    // Build deposit map (max deposit per hostel from rooms)
    const depositMap = new Map<string, number>();
    for (const r of rooms || []) {
      const current = depositMap.get(r.hostel_id) || 0;
      if (r.deposit_amount > current) depositMap.set(r.hostel_id, r.deposit_amount);
    }

    const hostelContext = (hostels || []).map((h: any) => {
      const facs = facilityMap.get(h.id) || [];
      const deposit = depositMap.get(h.id) || 0;
      return `- ID:${h.id} | ${h.name} | ${h.city} | ${h.address} | Type: ${h.hostel_type} | ₹${h.price_per_month}/month | Deposit: ₹${deposit} | Available Rooms: ${h.available_rooms ?? "N/A"} | Rating: ${h.rating ?? "N/A"}/5 | Facilities: ${facs.length > 0 ? facs.join(", ") : "none listed"} | ${h.description || ""}`;
    }).join("\n");

    const hostelNameMap = new Map((hostels || []).map((h: any) => [h.id, h.name]));
    const roomContext = (rooms || [])
      .filter((r: any) => r.beds_available > 0)
      .map((r: any) => {
        const hostelName = hostelNameMap.get(r.hostel_id) || "Unknown";
        return `  Room ${r.room_no} in ${hostelName}: ${r.sharing_type} sharing, ₹${r.rent_per_bed}/bed, ${r.beds_available} beds free, Floor ${r.floor}, Deposit ₹${r.deposit_amount}${r.balcony ? ", Balcony" : ""}${r.attached_bath ? ", Attached Bath" : ""}`;
      })
      .join("\n");

    const systemPrompt = `You are Buddy, the friendly AI assistant for Stayzy — a student hostel finder platform.

Your job is to help students find the perfect hostel based on their needs like budget, gender preference (boys/girls/co-ed), and location.

Use ONLY the following hostel data to answer questions. Do NOT make up hostel names or details.

=== AVAILABLE HOSTELS ===
${hostelContext || "No hostels currently available."}

=== AVAILABLE ROOMS ===
${roomContext || "No room details available."}
=== END DATA ===

IMPORTANT RESPONSE FORMAT:
You MUST respond with valid JSON only. No text outside the JSON object.

The JSON must have this structure:
{
  "reply": "Your friendly text response here",
  "hostels": [...] or null,
  "compare": [...] or null
}

Rules for the JSON fields:
- "reply": Always include a friendly text message.
- "hostels": When recommending hostels, include an array of hostel objects with these exact fields: { "id": "uuid", "name": "string", "city": "string", "price_per_month": number, "hostel_type": "boys|girls|co-ed", "rating": number|null, "available_rooms": number|null }. Only include hostels from the data above. Set to null if not recommending specific hostels.
- "compare": When the user asks to compare hostels, include an array of hostel objects with these exact fields: { "id": "uuid", "name": "string", "city": "string", "price_per_month": number, "hostel_type": "boys|girls|co-ed", "rating": number|null, "available_rooms": number|null, "deposit": number, "facilities": { "wifi": boolean, "ac": boolean, "food": boolean, "laundry": boolean, "parking": boolean } }. Map the facility names from the data to these boolean fields. If a facility is listed for a hostel, set it to true. Set to null if not comparing.

Guidelines:
- When recommending hostels, always populate the "hostels" array.
- If the user asks to compare 2+ hostels, populate the "compare" array instead.
- If the user asks about budget, filter hostels within their range.
- If the user specifies gender, only suggest matching hostel types.
- If no hostels match: set hostels to null and explain in reply.
- If query is unclear, ask follow-up questions in reply and set hostels/compare to null.
- Format prices in ₹ (Indian Rupees) in the reply text.
- Do NOT answer questions unrelated to hostels or Stayzy.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ reply: "I'm having trouble right now. Please try again later.", hostels: null, compare: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";

    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = { reply: rawContent, hostels: null, compare: null };
    }

    return new Response(JSON.stringify({
      reply: parsed.reply || rawContent || "I couldn't generate a response.",
      hostels: parsed.hostels || null,
      compare: parsed.compare || null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("buddy-chat error:", e);
    return new Response(JSON.stringify({ reply: "Something went wrong. Please try again. 😔", hostels: null, compare: null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
