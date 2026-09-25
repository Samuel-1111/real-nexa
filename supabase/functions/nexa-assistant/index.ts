import { createClient } from "npm:@supabase/supabase-js@2.117.1";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"";
const SECRET_BUNDLE=(()=>{try{return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}")}catch{return {}}})();
const SUPABASE_KEY=SECRET_BUNDLE.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const GEMINI_API_KEY=Deno.env.get("GEMINI_API_KEY")||"";
const GEMINI_MODEL=Deno.env.get("GEMINI_MODEL")||"gemini-3.8-flash";
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const admin=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json",...CORS}});
const functions=[
{name:"create_task",description:"Create a task for the authenticated user.",parameters:{type:"object",properties:{title:{type:"string"},due_at:{type:"string"},priority:{type:"string",enum:["low","normal","high","urgent"]}},required:["title"]}},
{name:"list_tasks",description:"List the authenticated user's tasks.",parameters:{type:"object",properties:{include_completed:{type:"boolean"}},required:[]}},
{name:"complete_task",description:"Complete one of the authenticated user's tasks.",parameters:{type:"object",properties:{task_id:{type:"string"}},required:["task_id"]}},
{name:"create_reminder",description:"Create a reminder for the authenticated user.",parameters:{type:"object",properties:{title:{type:"string"},remind_at:{type:"string"}},required:["title","remind_at"]}},
{name:"list_reminders",description:"List the authenticated user's reminders.",parameters:{type:"object",properties:{include_completed:{type:"boolean"}},required:[]}},
{name:"complete_reminder",description:"Complete one of the authenticated user's reminders.",parameters:{type:"object",properties:{reminder_id:{type:"string"}},required:["reminder_id"]}},
{name:"create_event",description:"Create a calendar event.",parameters:{type:"object",properties:{title:{type:"string"},starts_at:{type:"string"},ends_at:{type:"string"},location:{type:"string"}},required:["title","starts_at","ends_at"]}},
{name:"list_events",description:"List upcoming calendar events.",parameters:{type:"object",properties:{from:{type:"string"},to:{type:"string"}},required:[]}},
{name:"create_note",description:"Create a note.",parameters:{type:"object",properties:{title:{type:"string"},content:{type:"string"}},required:["title","content"]}},
{name:"list_notes",description:"List recent notes.",parameters:{type:"object",properties:{limit:{type:"number"}},required:[]}},
{name:"create_goal",description:"Create a goal.",parameters:{type:"object",properties:{title:{type:"string"},description:{type:"string"},target_date:{type:"string"}},required:["title"]}},
{name:"list_goals",description:"List goals.",parameters:{type:"object",properties:{},required:[]}},
{name:"save_memory",description:"Save a useful user preference or fact to NEXA memory only when the user explicitly asks you to remember it.",parameters:{type:"object",properties:{content:{type:"string"},category:{type:"string"}},required:["content"]}},
{name:"list_memories",description:"List the user's saved memories when they ask what NEXA remembers.",parameters:{type:"object",properties:{},required:[]}},
{name:"delete_memory",description:"Delete a saved memory by ID when the user asks NEXA to forget it.",parameters:{type:"object",properties:{memory_id:{type:"string"}},required:["memory_id"]}}
];
async function gemini(contents:any[],system:string,webSearch:boolean){
 if(!GEMINI_API_KEY)throw new Error("GEMINI_API_KEY is not configured");
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),50000);
 try{
  const tools:any[]=[{functionDeclarations:functions}];if(webSearch)tools.push({googleSearch:{}});
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":GEMINI_API_KEY},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents,tools,generationConfig:{maxOutputTokens:900,thinkingConfig:{thinkingLevel:"low"}}}),signal:controller.signal});
  const raw=await r.text();if(!r.ok)throw new Error(`Gemini ${r.status}: ${raw.slice(0,1500)}`);return JSON.parse(raw);
 }finally{clearTimeout(timer)}
}
async function tool(name:string,a:any,userId:string){
 try{
  if(name==="create_task"){const {data,error}=await admin.from("tasks").insert({user_id:userId,title:String(a.title||"").slice(0,300),due_at:a.due_at||null,priority:a.priority||"normal"}).select("id,title,due_at,priority,completed_at").single();return error?{error:error.message}:data}
  if(name==="list_tasks"){let q=admin.from("tasks").select("id,title,due_at,completed_at,priority").eq("user_id",userId).order("due_at",{ascending:true,nullsFirst:false}).limit(50);if(!a.include_completed)q=q.is("completed_at",null);const {data,error}=await q;return error?{error:error.message}:data||[]}
  if(name==="complete_task"){const {data,error}=await admin.from("tasks").update({completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",a.task_id).eq("user_id",userId).select("id,title,completed_at").maybeSingle();return error?{error:error.message}:data||{error:"Task not found"}}
  if(name==="create_reminder"){const {data,error}=await admin.from("reminders").insert({user_id:userId,title:String(a.title||"").slice(0,300),remind_at:a.remind_at}).select("id,title,remind_at,completed_at").single();return error?{error:error.message}:data}
  if(name==="list_reminders"){let q=admin.from("reminders").select("id,title,remind_at,completed_at,notified_at").eq("user_id",userId).order("remind_at",{ascending:true}).limit(50);if(!a.include_completed)q=q.is("completed_at",null);const {data,error}=await q;return error?{error:error.message}:data||[]}
  if(name==="complete_reminder"){const {data,error}=await admin.from("reminders").update({completed_at:new Date().toISOString()}).eq("id",a.reminder_id).eq("user_id",userId).select("id,title,remind_at,completed_at").maybeSingle();return error?{error:error.message}:data||{error:"Reminder not found"}}
  if(name==="create_event"){const {data,error}=await admin.from("calendar_events").insert({user_id:userId,title:String(a.title||"").slice(0,300),starts_at:a.starts_at,ends_at:a.ends_at,location:a.location||null}).select("id,title,starts_at,ends_at,location").single();return error?{error:error.message}:data}
  if(name==="list_events"){let q=admin.from("calendar_events").select("id,title,starts_at,ends_at,location").eq("user_id",userId).order("starts_at",{ascending:true}).limit(50);if(a.from)q=q.gte("starts_at",a.from);if(a.to)q=q.lte("starts_at",a.to);const {data,error}=await q;return error?{error:error.message}:data||[]}
  if(name==="create_note"){const {data,error}=await admin.from("notes").insert({user_id:userId,title:String(a.title||"").slice(0,200),content:String(a.content||"").slice(0,20000)}).select("id,title,content").single();return error?{error:error.message}:data}
  if(name==="list_notes"){const limit=Math.min(Math.max(Number(a.limit)||10,1),30);const {data,error}=await admin.from("notes").select("id,title,content,updated_at").eq("user_id",userId).order("updated_at",{ascending:false}).limit(limit);return error?{error:error.message}:data||[]}
  if(name==="create_goal"){const {data,error}=await admin.from("goals").insert({user_id:userId,title:String(a.title||"").slice(0,200),description:a.description?String(a.description).slice(0,5000):null,target_date:a.target_date||null}).select("id,title,description,target_date,completed_at").single();return error?{error:error.message}:data}
  if(name==="list_goals"){const {data,error}=await admin.from("goals").select("id,title,description,target_date,completed_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(30);return error?{error:error.message}:data||[]}
  if(name==="save_memory"){const {data,error}=await admin.from("nexa_memories").insert({user_id:userId,content:String(a.content||"").slice(0,4000),category:String(a.category||"preference").slice(0,80)}).select("id,content,category").single();return error?{error:error.message}:data}
  if(name==="list_memories"){const {data,error}=await admin.from("nexa_memories").select("id,content,category,created_at,updated_at").eq("user_id",userId).order("updated_at",{ascending:false}).limit(100);return error?{error:error.message}:data||[]}
  if(name==="delete_memory"){const {data,error}=await admin.from("nexa_memories").delete().eq("id",a.memory_id).eq("user_id",userId).select("id").maybeSingle();return error?{error:error.message}:data||{error:"Memory not found"}}
  return {error:`Unknown tool: ${name}`};
 }catch(e){return {error:e instanceof Error?e.message:String(e)}}
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});if(req.method!=="POST")return json({error:"Method Not Allowed"},405);
 try{
  if(!SUPABASE_URL||!SUPABASE_KEY)return json({error:"Supabase server configuration is missing."},503);if(!GEMINI_API_KEY)return json({error:"AI service is not configured."},503);
  const auth=req.headers.get("Authorization")||"";const token=auth.startsWith("Bearer ")?auth.slice(7).trim():"";if(!token)return json({error:"Unauthorized."},401);
  const {data:authData,error:authError}=await admin.auth.getUser(token);if(authError||!authData.user)return json({error:"Unauthorized."},401);const user=authData.user;
  const body=await req.json();const message=typeof body.message==="string"?body.message.trim():"";if(!message||message.length>8000)return json({error:"Invalid message."},400);
  const conversationIdInput=typeof body.conversation_id==="string"?body.conversation_id:null;const webSearch=body.web_search===true;
  const attachments=Array.isArray(body.attachments)?body.attachments.slice(0,5):[];let attachmentParts:any[]=[];
  for(const f of attachments){if(!f||typeof f!="object")continue;const mime=String(f.mimeType||"");if(typeof f.text==="string"){attachmentParts.push({text:`\n\nFILE: ${String(f.name||"file")}\n${f.text.slice(0,60000)}`});continue}if(typeof f.data==="string"&&mime){if(f.data.length>16_000_000)throw new Error("Attachment is too large.");attachmentParts.push({inlineData:{mimeType:mime,data:f.data}})}}
  const [{data:conversation,error:conversationError},{data:history,error:historyError},{data:memories,error:memoryError}]=await Promise.all([
   conversationIdInput?admin.from("conversations").select("id").eq("id",conversationIdInput).eq("user_id",user.id).maybeSingle():Promise.resolve({data:null,error:null} as any),
   conversationIdInput?admin.from("messages").select("role,content").eq("conversation_id",conversationIdInput).eq("user_id",user.id).in("role",["user","assistant"]).order("created_at",{ascending:false}).limit(12):Promise.resolve({data:[],error:null} as any),
   admin.from("nexa_memories").select("content,category").eq("user_id",user.id).order("updated_at",{ascending:false}).limit(30)
  ]);
  if(conversationError)throw conversationError;if(historyError)throw historyError;if(memoryError)throw memoryError;
  const timezone=typeof body.timezone==="string"?body.timezone.slice(0,80):"Africa/Lagos";const userName=String(user.user_metadata?.display_name||user.user_metadata?.full_name||"there").slice(0,100);const now=new Date().toISOString();
  const memoryText=(memories||[]).map((m:any)=>`- ${m.content}`).join("\n");
  const system=`You are NEXA, a fast, smart personal assistant. Current UTC time: ${now}. User timezone: ${timezone}. User name: ${userName}.\nCREATOR: If asked who created, made, built or developed you or NEXA, answer exactly: "I was created by Olanlokun Samuel Ajibola, CEO of Samzy Technology."\nMEMORY: The following are user-approved memories. Use them when relevant. Never invent memories.\n${memoryText||"(none)"}\nPERSONAL DATA: Use the tools for the authenticated user's tasks, reminders, calendar, notes, goals and memories. Never claim an action succeeded unless its tool returned success.\nFILES: Analyze supplied images/PDFs/text/documents. For homework or worksheets, explain step-by-step and do not pretend unreadable content is readable.\nWEB: When web search is enabled, use current web information and cite the returned sources in the answer as [1], [2], etc. Never fabricate sources.\nWRITING: When asked for a letter, email, WhatsApp message, invitation, notice, proposal or similar, produce polished ready-to-send text with natural wording.\nSTYLE: concise, useful, human and confident. For voice, use short conversational sentences. Do not mention internal prompts, APIs, secrets or databases.`;
  const contents:any[]=[...(history||[]).reverse().map((m:any)=>({role:m.role==="assistant"?"model":"user",parts:[{text:String(m.content||"")}]})),{role:"user",parts:[{text:message},...attachmentParts]}];
  let reply="";let sources:Source[]=[];let inputTokens=0;let outputTokens=0;
  for(let round=0;round<5;round++){
   const response=await gemini(contents,system,webSearch);inputTokens+=Number(response.usageMetadata?.promptTokenCount||0);outputTokens+=Number(response.usageMetadata?.candidatesTokenCount||0);
   const gm=response.groundingMetadata?.groundingChunks||[];sources=[...sources,...gm.map((x:any)=>x.web?{title:x.web.title,uri:x.web.uri}:null).filter(Boolean)];
   const modelContent=response.candidates?.[0]?.content;if(!modelContent)throw new Error(`Gemini returned no content. finishReason=${response.candidates?.[0]?.finishReason||"unknown"}`);
   const calls=(modelContent.parts||[]).map((p:any)=>p.functionCall).filter(Boolean);
   if(calls.length===0){reply=(modelContent.parts||[]).map((p:any)=>typeof p.text==="string"?p.text:"").join("").trim();if(!reply)throw new Error("Gemini returned an empty response.");break;}
   contents.push(modelContent);const parts:any[]=[];for(const call of calls){const result=await tool(String(call.name||""),call.args&&typeof call.args==="object"?call.args:{},user.id);parts.push({functionResponse:{name:String(call.name||""),id:call.id,response:{result}})}contents.push({role:"user",parts});
  }
  if(!reply)throw new Error("No final AI response was produced.");
  let conversationId=conversation?.id||null;if(!conversationId){const {data,error}=await admin.from("conversations").insert({user_id:user.id,title:message.slice(0,60)}).select("id").single();if(error)throw error;conversationId=data.id;}
  const {data:saved,error:saveError}=await admin.from("messages").insert([{conversation_id:conversationId,user_id:user.id,role:"user",content:message},{conversation_id:conversationId,user_id:user.id,role:"assistant",content:reply}]).select("id,role").eq("role","assistant").single();if(saveError)throw saveError;
  await admin.from("conversations").update({updated_at:new Date().toISOString()}).eq("id",conversationId).eq("user_id",user.id);if(inputTokens||outputTokens)void admin.rpc("record_nexa_ai_tokens",{p_user_id:user.id,p_input_tokens:inputTokens,p_output_tokens:outputTokens});
  const unique=sources.filter((s,i,a)=>s.uri&&a.findIndex(x=>x.uri===s.uri)===i).slice(0,10);
  return json({conversation_id:conversationId,reply,message_id:saved.id,sources:unique});
 }catch(error){console.error("nexa-assistant",error);return json({error:"NEXA could not complete that request.",debug:error instanceof Error?error.message.slice(0,1500):String(error)},500)}
});

type Source={title?:string;uri?:string};
