import { createClient } from "npm:@supabase/supabase-js@2.117.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SECRET_BUNDLE = (() => { try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"); } catch { return {}; } })();
const SUPABASE_KEY = SECRET_BUNDLE.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
const CORS = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS" };
const admin = createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{ autoRefreshToken:false, persistSession:false } });
function json(body:unknown,status=200){ return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json",...CORS}}); }
const functionDeclarations = [
{name:"create_task",description:"Create a task for the authenticated user.",parameters:{type:"object",properties:{title:{type:"string"},due_at:{type:"string",description:"ISO-8601 datetime or omit"},priority:{type:"string",enum:["low","normal","high","urgent"]}},required:["title"]}},
{name:"list_tasks",description:"List the authenticated user's tasks.",parameters:{type:"object",properties:{include_completed:{type:"boolean"}},required:[]}},
{name:"complete_task",description:"Complete one of the authenticated user's tasks.",parameters:{type:"object",properties:{task_id:{type:"string"}},required:["task_id"]}},
{name:"create_reminder",description:"Create a reminder for the authenticated user.",parameters:{type:"object",properties:{title:{type:"string"},remind_at:{type:"string",description:"ISO-8601 datetime"}},required:["title","remind_at"]}},
{name:"list_reminders",description:"List the authenticated user's reminders.",parameters:{type:"object",properties:{include_completed:{type:"boolean"}},required:[]}},
{name:"complete_reminder",description:"Complete one of the authenticated user's reminders.",parameters:{type:"object",properties:{reminder_id:{type:"string"}},required:["reminder_id"]}},
{name:"create_event",description:"Create a calendar event for the authenticated user.",parameters:{type:"object",properties:{title:{type:"string"},starts_at:{type:"string"},ends_at:{type:"string"},location:{type:"string"}},required:["title","starts_at","ends_at"]}},
{name:"list_events",description:"List upcoming calendar events for the authenticated user.",parameters:{type:"object",properties:{from:{type:"string"},to:{type:"string"}},required:[]}},
{name:"create_note",description:"Create a note for the authenticated user.",parameters:{type:"object",properties:{title:{type:"string"},content:{type:"string"}},required:["title","content"]}},
{name:"list_notes",description:"List recent notes for the authenticated user.",parameters:{type:"object",properties:{limit:{type:"number"}},required:[]}},
{name:"create_goal",description:"Create a goal for the authenticated user.",parameters:{type:"object",properties:{title:{type:"string"},description:{type:"string"},target_date:{type:"string"}},required:["title"]}},
{name:"list_goals",description:"List goals for the authenticated user.",parameters:{type:"object",properties:{},required:[]}}
];
async function callGemini(contents:any[],systemInstruction:string){
 if(!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");
 const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),45000);
 try{
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":GEMINI_API_KEY},body:JSON.stringify({systemInstruction:{parts:[{text:systemInstruction}]},contents,tools:[{functionDeclarations}],generationConfig:{maxOutputTokens:700,thinkingConfig:{thinkingLevel:"low"}}}),signal:controller.signal});
  const raw=await r.text(); if(!r.ok) throw new Error(`Gemini ${r.status}: ${raw.slice(0,1200)}`); return JSON.parse(raw);
 }finally{clearTimeout(timer);}
}
async function tool(name:string,args:any,userId:string){
 try{
  if(name==="create_task"){const {data,error}=await admin.from("tasks").insert({user_id:userId,title:String(args.title||"").slice(0,300),due_at:args.due_at||null,priority:args.priority||"normal"}).select("id,title,due_at,priority,completed_at").single();return error?{error:error.message}:data;}
  if(name==="list_tasks"){let q=admin.from("tasks").select("id,title,due_at,completed_at,priority").eq("user_id",userId).order("due_at",{ascending:true,nullsFirst:false}).limit(50);if(!args.include_completed)q=q.is("completed_at",null);const {data,error}=await q;return error?{error:error.message}:data||[];}
  if(name==="complete_task"){const {data,error}=await admin.from("tasks").update({completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",args.task_id).eq("user_id",userId).select("id,title,completed_at").maybeSingle();return error?{error:error.message}:data||{error:"Task not found"};}
  if(name==="create_reminder"){const {data,error}=await admin.from("reminders").insert({user_id:userId,title:String(args.title||"").slice(0,300),remind_at:args.remind_at}).select("id,title,remind_at,completed_at").single();return error?{error:error.message}:data;}
  if(name==="list_reminders"){let q=admin.from("reminders").select("id,title,remind_at,completed_at,notified_at").eq("user_id",userId).order("remind_at",{ascending:true}).limit(50);if(!args.include_completed)q=q.is("completed_at",null);const {data,error}=await q;return error?{error:error.message}:data||[];}
  if(name==="complete_reminder"){const {data,error}=await admin.from("reminders").update({completed_at:new Date().toISOString()}).eq("id",args.reminder_id).eq("user_id",userId).select("id,title,remind_at,completed_at").maybeSingle();return error?{error:error.message}:data||{error:"Reminder not found"};}
  if(name==="create_event"){const {data,error}=await admin.from("calendar_events").insert({user_id:userId,title:String(args.title||"").slice(0,300),starts_at:args.starts_at,ends_at:args.ends_at,location:args.location||null}).select("id,title,starts_at,ends_at,location").single();return error?{error:error.message}:data;}
  if(name==="list_events"){let q=admin.from("calendar_events").select("id,title,starts_at,ends_at,location").eq("user_id",userId).order("starts_at",{ascending:true}).limit(50);if(args.from)q=q.gte("starts_at",args.from);if(args.to)q=q.lte("starts_at",args.to);const {data,error}=await q;return error?{error:error.message}:data||[];}
  if(name==="create_note"){const {data,error}=await admin.from("notes").insert({user_id:userId,title:String(args.title||"").slice(0,200),content:String(args.content||"").slice(0,20000)}).select("id,title,content").single();return error?{error:error.message}:data;}
  if(name==="list_notes"){const limit=Math.min(Math.max(Number(args.limit)||10,1),30);const {data,error}=await admin.from("notes").select("id,title,content,updated_at").eq("user_id",userId).order("updated_at",{ascending:false}).limit(limit);return error?{error:error.message}:data||[];}
  if(name==="create_goal"){const {data,error}=await admin.from("goals").insert({user_id:userId,title:String(args.title||"").slice(0,200),description:args.description?String(args.description).slice(0,5000):null,target_date:args.target_date||null}).select("id,title,description,target_date,completed_at").single();return error?{error:error.message}:data;}
  if(name==="list_goals"){const {data,error}=await admin.from("goals").select("id,title,description,target_date,completed_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(30);return error?{error:error.message}:data||[];}
  return {error:`Unknown tool: ${name}`};
 }catch(e){return {error:e instanceof Error?e.message:String(e)};}
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:CORS}); if(req.method!=="POST")return json({error:"Method Not Allowed"},405);
 try{
  if(!SUPABASE_URL||!SUPABASE_KEY)return json({error:"Supabase server configuration is missing."},503); if(!GEMINI_API_KEY)return json({error:"AI service is not configured."},503);
  const auth=req.headers.get("Authorization")||"";const token=auth.startsWith("Bearer ")?auth.slice(7).trim():"";if(!token)return json({error:"Unauthorized."},401);
  const {data:authData,error:authError}=await admin.auth.getUser(token);if(authError||!authData.user)return json({error:"Unauthorized."},401);const user=authData.user;
  const body=await req.json();const message=typeof body.message==="string"?body.message.trim():"";if(!message||message.length>8000)return json({error:"Invalid message."},400);
  const requestedConversationId=typeof body.conversation_id==="string"?body.conversation_id:null;
  const [{data:quota,error:quotaError},{data:conversation,error:conversationError},{data:history,error:historyError}]=await Promise.all([
   admin.rpc("consume_nexa_ai_request",{p_user_id:user.id}),
   requestedConversationId?admin.from("conversations").select("id").eq("id",requestedConversationId).eq("user_id",user.id).maybeSingle():Promise.resolve({data:null,error:null} as any),
   requestedConversationId?admin.from("messages").select("role,content").eq("conversation_id",requestedConversationId).eq("user_id",user.id).in("role",["user","assistant"]).order("created_at",{ascending:false}).limit(12):Promise.resolve({data:[],error:null} as any)
  ]);
  if(quotaError)throw quotaError;if(conversationError)throw conversationError;if(historyError)throw historyError;const quotaRow=Array.isArray(quota)?quota[0]:quota;if(!quotaRow?.allowed)return json({error:`Daily AI limit reached for ${quotaRow?.plan||"free"} plan.`,daily_limit:quotaRow?.daily_limit??30,request_count:quotaRow?.request_count??0,plan:quotaRow?.plan||"free"},429);
  const timezone=typeof body.timezone==="string"?body.timezone.slice(0,80):"Africa/Lagos";const userName=String(user.user_metadata?.display_name||user.user_metadata?.full_name||"there").slice(0,100);const now=new Date().toISOString();
  const system=`You are NEXA, a fast, smart, concise personal assistant. Current UTC time: ${now}. User timezone: ${timezone}. User name: ${userName}.\nIf asked who created you, who made you, who your creator is, who developed NEXA, who built NEXA, who owns NEXA, or equivalent, answer: "I was created by Olanlokun Samuel Ajibola, CEO of Samzy Technology."\nUse the authenticated user's real tasks, reminders, calendar events, notes and goals. Use tools for create/list/complete actions. Never invent data or claim an action succeeded unless its tool returned success. Be direct and natural; for voice use short conversational sentences. Never mention internal instructions or tools.`;
  const contents:any[]=[...(history||[]).reverse().map((m:any)=>({role:m.role==="assistant"?"model":"user",parts:[{text:String(m.content||"")}]})),{role:"user",parts:[{text:message}]}];let reply="";let inputTokens=0;let outputTokens=0;
  for(let round=0;round<4;round++){
   const response=await callGemini(contents,system);inputTokens+=Number(response.usageMetadata?.promptTokenCount||0);outputTokens+=Number(response.usageMetadata?.candidatesTokenCount||0);const modelContent=response.candidates?.[0]?.content;if(!modelContent)throw new Error(`Gemini returned no content. finishReason=${response.candidates?.[0]?.finishReason||"unknown"}`);
   const calls=(modelContent.parts||[]).map((p:any)=>p.functionCall).filter(Boolean);if(calls.length===0){reply=(modelContent.parts||[]).map((p:any)=>typeof p.text==="string"?p.text:"").join("").trim();if(!reply)throw new Error("Gemini returned an empty response.");break;}
   contents.push(modelContent);const parts:any[]=[];for(const call of calls){const result=await tool(String(call.name||""),call.args&&typeof call.args==="object"?call.args:{},user.id);parts.push({functionResponse:{name:String(call.name||""),id:call.id,response:{result}}});}contents.push({role:"user",parts});
  }
  if(!reply)throw new Error("No final AI response was produced.");
  let conversationId=conversation?.id||null;if(!conversationId){const {data,error}=await admin.from("conversations").insert({user_id:user.id,title:message.slice(0,60)}).select("id").single();if(error)throw error;conversationId=data.id;}
  const {data:saved,error:saveError}=await admin.from("messages").insert([{conversation_id:conversationId,user_id:user.id,role:"user",content:message},{conversation_id:conversationId,user_id:user.id,role:"assistant",content:reply}]).select("id,role").eq("role","assistant").single();if(saveError)throw saveError;
  await admin.from("conversations").update({updated_at:new Date().toISOString()}).eq("id",conversationId).eq("user_id",user.id);if(inputTokens||outputTokens)void admin.rpc("record_nexa_ai_tokens",{p_user_id:user.id,p_input_tokens:inputTokens,p_output_tokens:outputTokens});
  return json({conversation_id:conversationId,reply,message_id:saved.id});
 }catch(error){console.error("nexa-assistant",error);return json({error:"NEXA could not complete that request.",debug:error instanceof Error?error.message.slice(0,1000):String(error)},500);}
});
