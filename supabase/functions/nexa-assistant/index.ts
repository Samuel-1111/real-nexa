import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "npm:openai";

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed",{status:405});
  try {
    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return Response.json({error:"Message is required"},{status:400});

    const completion = await openai.chat.completions.create({
      model: "gpt-5.6",
      messages: [
        {role:"system",content:"You are NEXA, a concise premium personal assistant. Help the authenticated user organize tasks, reminders, calendar events, notes and goals. Never claim an action was completed unless a tool or database operation actually completed it."},
        {role:"user",content:message}
      ],
      temperature:0.4
    });
    return Response.json({reply:completion.choices[0]?.message?.content ?? ""});
  } catch {
    return Response.json({error:"NEXA could not process that request."},{status:500});
  }
});
