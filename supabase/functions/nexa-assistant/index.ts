import { withSupabase } from "npm:@supabase/server@1.8.0";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const MODEL = "gpt-5.6";

const tools = [
  {type:"function",function:{name:"create_task",description:"Create a task for the authenticated user.",parameters:{type:"object",properties:{title:{type:"string"},due_at:{type:"string",description:"ISO-8601 datetime or null"},priority:{type:"string",enum:["low","normal","high","urgent"]}},required:["title"]}}},
  {type:"function",function:{name:"list_tasks",description:"List the user's tasks.",parameters:{type:"object",properties:{include_completed:{type:"boolean"}},required:[]}}},
  {type:"function",function:{name:"complete_task",description:"Complete one of the user's tasks by id.",parameters:{type:"object",properties:{task_id:{type:"string"}},required:["task_id"]}}},
  {type:"function",function:{name:"create_reminder",description:"Create a reminder for the authenticated user.",parameters:{type:"object",properties:{title:{type:"string"},remind_at:{type:"string",description:"ISO-8601 datetime"}},required:["title","remind_at"]}}},
  {type:"function",function:{name:"create_event",description:"Create a calendar event.",parameters:{type:"object",properties:{title:{type:"string"},starts_at:{type:"string",description:"ISO-8601 datetime"},ends_at:{type:"string",description:"ISO-8601 datetime"},location:{type:"string"}},required:["title","starts_at","ends_at"]}}},
  {type:"function",function:{name:"list_events",description:"List upcoming calendar events.",parameters:{type:"object",properties:{from:{type:"string"},to:{type:"string"}},required:[]}}},
  {type:"function",function:{name:"create_note",description:"Create a note.",parameters:{type:"object",properties:{title:{type:"string"},content:{type:"string"}},required:["title","content"]}}},
  {type:"function",function:{name:"list_notes",description:"List the user's recent notes.",parameters:{type:"object",properties:{limit:{type:"number"}},required:[]}}},
  {type:"function",function:{name:"create_goal",description:"Create a goal.",parameters:{type:"object",properties:{title:{type:"string"},description:{type:"string"},target_date:{type:"string",description:"YYYY-MM-DD"}},required:["title"]}}},
  {type:"function",function:{name:"list_goals",description:"List the user's goals.",parameters:{type:"object",properties:{},required:[]}}}
];

async function openai(messages:unknown[]){
  const response=await fetch("https://api.openai.com/v1/chat/completions",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${OPENAI_API_KEY}`},
    body:JSON.stringify({model:MODEL,messages,tools,tool_choice:"auto"})
  });
  if(!response.ok) throw new Error(await response.text());
  return await response.json();
}

async function runTool(name:string,args:any,userId:string,db:any){
  if(name==="create_task"){
    const {data,error}=await db.from("tasks").insert({user_id:userId,title:String(args.title).slice(0,300),due_at:args.due_at||null,priority:args.priority||"normal"}).select("id,title,due_at,priority").single(); return error?{error:error.message}:data;
  }
  if(name==="list_tasks"){
    let q=db.from("tasks").select("id,title,due_at,completed_at,priority").eq("user_id",userId).order("due_at",{ascending:true,nullsFirst:false}).limit(50);
    if(!args.include_completed) q=q.is("completed_at",null); const {data,error}=await q; return error?{error:error.message}:data;
  }
  if(name==="complete_task"){
    const {data,error}=await db.from("tasks").update({completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",args.task_id).eq("user_id",userId).select("id,title,completed_at").maybeSingle(); return error?{error:error.message}:data||{error:"Task not found"};
  }
  if(name==="create_reminder"){
    const {data,error}=await db.from("reminders").insert({user_id:userId,title:String(args.title).slice(0,300),remind_at:args.remind_at}).select("id,title,remind_at").single(); return error?{error:error.message}:data;
  }
  if(name==="create_event"){
    const {data,error}=await db.from("calendar_events").insert({user_id:userId,title:String(args.title).slice(0,300),starts_at:args.starts_at,ends_at:args.ends_at,location:args.location||null}).select("id,title,starts_at,ends_at,location").single(); return error?{error:error.message}:data;
  }
  if(name==="list_events"){
    let q=db.from("calendar_events").select("id,title,starts_at,ends_at,location").eq("user_id",userId).order("starts_at",{ascending:true}).limit(50);
    if(args.from)q=q.gte("starts_at",args.from); if(args.to)q=q.lte("starts_at",args.to); const {data,error}=await q; return error?{error:error.message}:data;
  }
  if(name==="create_note"){
    const {data,error}=await db.from("notes").insert({user_id:userId,title:String(args.title).slice(0,200),content:String(args.content).slice(0,20000)}).select("id,title,content").single(); return error?{error:error.message}:data;
  }
  if(name==="list_notes"){
    const limit=Math.min(Math.max(Number(args.limit)||10,1),30); const {data,error}=await db.from("notes").select("id,title,content,updated_at").eq("user_id",userId).order("updated_at",{ascending:false}).limit(limit); return error?{error:error.message}:data;
  }
  if(name==="create_goal"){
    const {data,error}=await db.from("goals").insert({user_id:userId,title:String(args.title).slice(0,200),description:args.description?String(args.description).slice(0,5000):null,target_date:args.target_date||null}).select("id,title,target_date").single(); return error?{error:error.message}:data;
  }
  if(name==="list_goals"){
    const {data,error}=await db.from("goals").select("id,title,description,target_date,completed_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(30); return error?{error:error.message}:data;
  }
  return {error:"Unknown tool"};
}

export default {
  fetch: withSupabase({auth:"user"}, async (req,ctx)=>{
    if(req.method!=="POST") return new Response("Method Not Allowed",{status:405});
    if(!OPENAI_API_KEY) return Response.json({error:"OPENAI_API_KEY is not configured."},{status:503});
    try{
      const body=await req.json();
      const message=typeof body.message==="string"?body.message.trim():"";
      if(!message||message.length>8000) return Response.json({error:"Invalid message."},{status:400});
      const userId=ctx.userClaims?.sub;
      if(!userId) return Response.json({error:"Unauthorized."},{status:401});

      const db=ctx.supabaseAdmin;
      let conversationId=typeof body.conversation_id==="string"?body.conversation_id:null;
      if(conversationId){
        const {data}=await db.from("conversations").select("id").eq("id",conversationId).eq("user_id",userId).maybeSingle();
        if(!data) conversationId=null;
      }
      if(!conversationId){
        const {data,error}=await db.from("conversations").insert({user_id:userId,title:message.slice(0,60)}).select("id").single();
        if(error) throw error; conversationId=data.id;
      }

      await db.from("messages").insert({conversation_id:conversationId,user_id:userId,role:"user",content:message});
      const {data:history,error:historyError}=await db.from("messages").select("role,content").eq("conversation_id",conversationId).in("role",["user","assistant"]).order("created_at",{ascending:true}).limit(40);
      if(historyError) throw historyError;

      const {data:profile}=await db.from("profiles").select("display_name,timezone").eq("id",userId).maybeSingle();
      const now=new Date().toISOString();
      const system={role:"system",content:`You are NEXA, a premium personal assistant. Current UTC time: ${now}. User timezone: ${profile?.timezone||"UTC"}. User name: ${profile?.display_name||"there"}. Use tools for real actions. Never claim an action happened unless the tool returned success. For destructive actions, do not invent delete capabilities. Be concise, clear, and practical.`};
      const msgs:any[]=[system,...(history||[])];
      let reply="";
      for(let i=0;i<4;i++){
        const completion=await openai(msgs);
        const assistant=completion.choices?.[0]?.message;
        if(!assistant) throw new Error("OpenAI returned no message.");
        if(!assistant.tool_calls?.length){reply=assistant.content||"I’m here.";break;}
        msgs.push(assistant);
        for(const call of assistant.tool_calls){
          let args:any={}; try{args=JSON.parse(call.function.arguments||"{}")}catch{}
          const result=await runTool(call.function.name,args,userId,db);
          msgs.push({role:"tool",tool_call_id:call.id,content:JSON.stringify(result)});
        }
      }
      if(!reply) reply="I completed the available actions. What would you like to do next?";
      const {data:saved,error:savedError}=await db.from("messages").insert({conversation_id:conversationId,user_id:userId,role:"assistant",content:reply}).select("id").single();
      if(savedError) throw savedError;
      await db.from("conversations").update({updated_at:new Date().toISOString()}).eq("id",conversationId).eq("user_id",userId);
      return Response.json({conversation_id:conversationId,reply,message_id:saved.id});
    }catch(error){
      console.error("nexa-assistant",error);
      return Response.json({error:"NEXA could not complete that request."},{status:500});
    }
  })
};