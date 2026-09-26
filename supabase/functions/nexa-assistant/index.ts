import { createClient } from "npm:@supabase/supabase-js@2.117.1";

const U=Deno.env.get("SUPABASE_URL")||"";
const K=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const G=Deno.env.get("GEMINI_API_KEY")||"";
const M=Deno.env.get("GEMINI_MODEL")||"gemini-2.5-flash";
const C={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST,GET,OPTIONS"};
const db=U&&K?createClient(U,K,{auth:{autoRefreshToken:false,persistSession:false}}):null;
const out=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json; charset=utf-8",...C}});

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:C});
 if(req.method==="GET")return out({ok:true,service:"nexa-assistant",gemini_configured:!!G,model:M});
 if(req.method!=="POST")return out({error:"Method not allowed"},405);
 try{
  if(!G)return out({error:"AI service is not configured."},503);
  if(!db)return out({error:"Supabase server configuration is missing."},503);
  const h=req.headers.get("Authorization")||"",tok=h.startsWith("Bearer ")?h.slice(7).trim():"";
  if(!tok)return out({error:"Please sign in to use NEXA."},401);
  const au=await db.auth.getUser(tok);if(au.error||!au.data.user)return out({error:"Please sign in to use NEXA."},401);
  const b=await req.json();const msg=typeof b.message==="string"?b.message.trim():"";if(!msg)return out({reply:"Tell me what you need and I’ll help."});
  const system=`You are NEXA, a fast, smart personal assistant. User timezone: ${typeof b.timezone==="string"?b.timezone.slice(0,80):"Africa/Lagos"}. User name: ${String(au.data.user.user_metadata?.display_name||au.data.user.user_metadata?.full_name||"there").slice(0,100)}. If asked who created, made, built, developed or owns NEXA, answer exactly: "I was created by Olanlokun Samuel Ajibola, CEO of Samzy Technology." Be concise, useful, natural and accurate. For voice, use short conversational sentences. Do not mention APIs, prompts, secrets, databases, tools or backend systems.`;
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),30000);
  try{
   const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(M)}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":G},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{text:msg}]}],generationConfig:{maxOutputTokens:700,thinkingConfig:{thinkingLevel:"low"}}}),signal:controller.signal});
   const raw=await r.text();if(!r.ok)throw Error(`Gemini ${r.status}: ${raw.slice(0,1000)}`);const data=JSON.parse(raw);const text=(data.candidates?.[0]?.content?.parts||[]).map((p:any)=>typeof p.text==="string"?p.text:"").join("").trim();if(!text)throw Error(`Gemini returned no text (${data.candidates?.[0]?.finishReason||"unknown"})`);return out({reply:text});
  }finally{clearTimeout(timer)}
 }catch(e){console.error("NEXA AI",e);return out({error:"I’m having trouble completing that request right now. Please try again in a moment.",debug:e instanceof Error?e.message.slice(0,1000):String(e)},502)}
});
