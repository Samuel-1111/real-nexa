import { createClient } from "@supabase/supabase-js";
const url=Deno.env.get("SUPABASE_URL")||"";
const bundle=(()=>{try{return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}")}catch{return {}}})();
const key=bundle.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const gemKey=Deno.env.get("GEMINI_API_KEY")||"";
const model=Deno.env.get("GEMINI_MODEL")||"gemini-3.5-flash";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const db=url&&key?createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}}):null;
const reply=(b:any,id:string)=>new Response(JSON.stringify({...b,request_id:id}),{status:200,headers:{...H,"X-Request-Id":id}});
const fail=(m:string,c:string,id:string)=>reply({success:false,reply:m,error:m,error_code:c},id);
const decl=[
{name:"create_task",description:"Create a task for the user.",parameters:{type:"object",properties:{title:{type:"string"},due_at:{type:"string"},priority:{type:"string",enum:["low","normal","high","urgent"]}},required:["title"]}},
{name:"list_tasks",description:"List the user's tasks.",parameters:{type:"object",properties:{include_completed:{type:"boolean"}},required:[]}},
{name:"complete_task",description:"Complete a task.",parameters:{type:"object",properties:{task_id:{type:"string"}},required:["task_id"]}},
{name:"create_reminder",description:"Create a reminder.",parameters:{type:"object",properties:{title:{type:"string"},remind_at:{type:"string"}},required:["title","remind_at"]}},
{name:"list_reminders",description:"List reminders.",parameters:{type:"object",properties:{include_completed:{type:"boolean"}},required:[]}},
{name:"complete_reminder",description:"Complete a reminder.",parameters:{type:"object",properties:{reminder_id:{type:"string"}},required:["reminder_id"]}},
{name:"create_event",description:"Create a calendar event.",parameters:{type:"object",properties:{title:{type:"string"},starts_at:{type:"string"},ends_at:{type:"string"},location:{type:"string"}},required:["title","starts_at","ends_at"]}},
{name:"list_events",description:"List calendar events.",parameters:{type:"object",properties:{from:{type:"string"},to:{type:"string"}},required:[]}},
{name:"create_note",description:"Save a note.",parameters:{type:"object",properties:{title:{type:"string"},content:{type:"string"}},required:["title","content"]}},
{name:"list_notes",description:"List notes.",parameters:{type:"object",properties:{limit:{type:"number"}},required:[]}},
{name:"create_goal",description:"Create a goal.",parameters:{type:"object",properties:{title:{type:"string"},description:{type:"string"},target_date:{type:"string"}},required:["title"]}},
{name:"list_goals",description:"List goals.",parameters:{type:"object",properties:{},required:[]}}
];
async function tool(n:string,a:any,u:string){if(!db)return{error:"Database unavailable"};try{
if(n==="create_task"){const{data,error}=await db.from("tasks").insert({user_id:u,title:String(a.title||"").slice(0,300),due_at:a.due_at||null,priority:a.priority||"normal"}).select("id,title,due_at,priority,completed_at").single();return error?{error:error.message}:data}
if(n==="list_tasks"){let q=db.from("tasks").select("id,title,description,due_at,completed_at,priority").eq("user_id",u).order("due_at",{ascending:true,nullsFirst:false}).limit(50);if(!a.include_completed)q=q.is("completed_at",null);const{data,error}=await q;return error?{error:error.message}:data||[]}
if(n==="complete_task"){const now=new Date().toISOString();const{data,error}=await db.from("tasks").update({completed_at:now,updated_at:now}).eq("id",a.task_id).eq("user_id",u).select("id,title,completed_at").maybeSingle();return error?{error:error.message}:data||{error:"Task not found"}}
if(n==="create_reminder"){const{data,error}=await db.from("reminders").insert({user_id:u,title:String(a.title||"").slice(0,300),remind_at:a.remind_at}).select("id,title,remind_at,completed_at").single();return error?{error:error.message}:data}
if(n==="list_reminders"){let q=db.from("reminders").select("id,title,remind_at,completed_at,notified_at").eq("user_id",u).order("remind_at",{ascending:true}).limit(50);if(!a.include_completed)q=q.is("completed_at",null);const{data,error}=await q;return error?{error:error.message}:data||[]}
if(n==="complete_reminder"){const{data,error}=await db.from("reminders").update({completed_at:new Date().toISOString()}).eq("id",a.reminder_id).eq("user_id",u).select("id,title,remind_at,completed_at").maybeSingle();return error?{error:error.message}:data||{error:"Reminder not found"}}
if(n==="create_event"){const{data,error}=await db.from("calendar_events").insert({user_id:u,title:String(a.title||"").slice(0,300),starts_at:a.starts_at,ends_at:a.ends_at,location:a.location||null}).select("id,title,starts_at,ends_at,location").single();return error?{error:error.message}:data}
if(n==="list_events"){let q=db.from("calendar_events").select("id,title,description,starts_at,ends_at,location").eq("user_id",u).order("starts_at",{ascending:true}).limit(50);if(a.from)q=q.gte("starts_at",a.from);if(a.to)q=q.lte("starts_at",a.to);const{data,error}=await q;return error?{error:error.message}:data||[]}
if(n==="create_note"){const{data,error}=await db.from("notes").insert({user_id:u,title:String(a.title||"").slice(0,200),content:String(a.content||"").slice(0,20000)}).select("id,title,content").single();return error?{error:error.message}:data}
if(n==="list_notes"){const limit=Math.min(Math.max(Number(a.limit)||10,1),30);const{data,error}=await db.from("notes").select("id,title,content,updated_at").eq("user_id",u).order("updated_at",{ascending:false}).limit(limit);return error?{error:error.message}:data||[]}
if(n==="create_goal"){const{data,error}=await db.from("goals").insert({user_id:u,title:String(a.title||"").slice(0,200),description:a.description?String(a.description).slice(0,5000):null,target_date:a.target_date||null}).select("id,title,description,target_date,completed_at").single();return error?{error:error.message}:data}
if(n==="list_goals"){const{data,error}=await db.from("goals").select("id,title,description,target_date,completed_at").eq("user_id",u).order("created_at",{ascending:false}).limit(30);return error?{error:error.message}:data||[]}
return{error:"Unknown tool"}}catch(e){return{error:e instanceof Error?e.message:String(e)}}}
async function gem(contents:any[],system:string,id:string){
if(!gemKey)return{error:fail("NEXA AI is not configured on the server yet.","AI_CONFIG_MISSING",id)};
const models=model==="gemini-3.5-flash"?[model]:[model,"gemini-3.5-flash"];
for(const m of models){try{const ac=new AbortController();const t=setTimeout(()=>ac.abort(),30000);const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(m)+":generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":gemKey},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents,tools:[{functionDeclarations:decl}],generationConfig:{maxOutputTokens:700,thinkingConfig:{thinkingLevel:"low"}}}),signal:ac.signal});clearTimeout(t);const raw=await r.text();if(r.ok)return{data:JSON.parse(raw)};console.error(JSON.stringify({request_id:id,model:m,status:r.status,body:raw.slice(0,800)}));if(r.status===401||r.status===403)return{error:fail("NEXA could not authenticate with Gemini. Check GEMINI_API_KEY in Supabase Secrets.","AI_PROVIDER_AUTH",id)};if(r.status===429)continue;if(r.status!==404&&r.status!==503)return{error:fail("NEXA could not reach Gemini right now. Please try again shortly.","AI_PROVIDER_UNAVAILABLE",id)}}catch(e){if(e instanceof Error&&e.name==="AbortError")return{error:fail("NEXA took too long to respond. Please try again.","AI_PROVIDER_TIMEOUT",id)}}}
return{error:fail("Gemini is temporarily unavailable. Please try again shortly.","AI_PROVIDER_UNAVAILABLE",id)}}
Deno.serve(async(req)=>{
const id=req.headers.get("x-request-id")||crypto.randomUUID();
try{
if(req.method==="OPTIONS")return new Response("ok",{headers:H});
if(req.method!=="POST")return fail("Only POST requests are supported.","INVALID_REQUEST",id);
if(!db)return fail("NEXA server configuration is incomplete.","SERVER_CONFIG",id);
const auth=req.headers.get("Authorization")||"";const token=auth.startsWith("Bearer ")?auth.slice(7).trim():"";if(!token)return fail("Please sign in to use NEXA AI.","AUTH_REQUIRED",id);
const au=await db.auth.getUser(token);if(au.error||!au.data.user)return fail("Your NEXA session has expired. Please sign in again.","AUTH_EXPIRED",id);
const u=au.data.user.id;const body=await req.json();const msg=typeof body.message==="string"?body.message.trim():"";if(!msg)return fail("Message is required.","INVALID_REQUEST",id);
const cid=typeof body.conversation_id==="string"?body.conversation_id:null;let hist:any[]=[];
if(cid){const h=await db.from("messages").select("role,content").eq("conversation_id",cid).eq("user_id",u).in("role",["user","assistant"]).order("created_at",{ascending:false}).limit(12);hist=(h.data||[]).reverse()}
const system="You are NEXA, a fast, smart personal assistant. If asked who created you, who made you, your creator, who built NEXA, who developed NEXA, or similar, answer exactly: \"I was created by Olanlokun Samuel Ajibola, CEO of Samzy Technology.\" Use the authenticated user's real tasks, reminders, calendar, notes and goals through tools. Never invent data or claim success unless a tool succeeded. Be concise, natural and helpful.";
const contents:any[]=[...hist.map(x=>({role:x.role==="assistant"?"model":"user",parts:[{text:String(x.content||"")}]})),{role:"user",parts:[{text:msg}]}];let final="";let finalCid=cid;
for(let i=0;i<5;i++){const g=await gem(contents,system,id);if(g.error)return g.error;const mc=g.data?.candidates?.[0]?.content;if(!mc)return fail("NEXA received no usable response from Gemini.","AI_EMPTY",id);const calls=(mc.parts||[]).map((p:any)=>p.functionCall).filter(Boolean);if(!calls.length){final=(mc.parts||[]).map((p:any)=>typeof p.text==="string"?p.text:"").join("").trim();break}contents.push(mc);const parts:any[]=[];for(const c of calls){parts.push({functionResponse:{name:String(c.name||""),id:c.id,response:{result:await tool(String(c.name||""),c.args||{},u)}}})}contents.push({role:"user",parts})}
if(!final)return fail("NEXA could not finish that request. Please try again.","AI_NO_FINAL",id);
if(!finalCid){const c=await db.from("conversations").insert({user_id:u,title:msg.slice(0,60)}).select("id").single();finalCid=c.data?.id||null}
if(finalCid){await db.from("messages").insert([{conversation_id:finalCid,user_id:u,role:"user",content:msg},{conversation_id:finalCid,user_id:u,role:"assistant",content:final}]);await db.from("conversations").update({updated_at:new Date().toISOString()}).eq("id",finalCid).eq("user_id",u)}
return reply({success:true,reply:final,conversation_id:finalCid},id);
}catch(e){console.error(JSON.stringify({request_id:id,error:e instanceof Error?e.message:String(e)}));return fail("NEXA could not complete that request. Please try again.","INTERNAL_ERROR",id)}
});