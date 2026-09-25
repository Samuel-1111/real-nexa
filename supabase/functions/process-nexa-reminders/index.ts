import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.117.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("Missing Supabase runtime credentials");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-nexa-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PushSubscriptionRow = { id:string; user_id:string; endpoint:string; p256dh:string; auth:string };
type ReminderRow = { id:string; user_id:string; title:string; remind_at:string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return Response.json({error:"Method not allowed"}, {status:405,headers:cors});

  const {data:configRows,error:configError}=await admin.rpc("get_nexa_web_push_config");
  const config=configRows?.[0] as {vapid_public_key:string;vapid_private_key:string;cron_secret:string;subject:string}|undefined;
  if (configError || !config) return Response.json({error:"Push configuration unavailable"},{status:500,headers:cors});
  if (req.headers.get("x-nexa-cron-secret") !== config.cron_secret) return Response.json({error:"Unauthorized"},{status:401,headers:cors});

  webpush.setVapidDetails(config.subject,config.vapid_public_key,config.vapid_private_key);

  const now=new Date().toISOString();
  const {data:reminders,error:reminderError}=await admin.from("reminders")
    .select("id,user_id,title,remind_at").is("completed_at",null).is("notified_at",null)
    .lte("remind_at",now).order("remind_at",{ascending:true}).limit(100);
  if(reminderError) return Response.json({error:reminderError.message},{status:500,headers:cors});
  const due=(reminders||[]) as ReminderRow[];
  if(!due.length) return Response.json({processed:0,delivered:0,stale:0},{headers:cors});

  const userIds=[...new Set(due.map(r=>r.user_id))];
  const {data:subscriptions,error:subscriptionError}=await admin.from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth").in("user_id",userIds);
  if(subscriptionError) return Response.json({error:subscriptionError.message},{status:500,headers:cors});

  const grouped=new Map<string,PushSubscriptionRow[]>();
  for(const sub of (subscriptions||[]) as PushSubscriptionRow[]){const list=grouped.get(sub.user_id)||[];list.push(sub);grouped.set(sub.user_id,list);}

  let delivered=0,stale=0,processed=0;
  for(const reminder of due){
    const targets=grouped.get(reminder.user_id)||[];
    let sent=false;
    const payload=JSON.stringify({title:"NEXA reminder",body:reminder.title,reminderId:reminder.id,remindAt:reminder.remind_at,url:"/?tab=reminders"});
    for(const sub of targets){
      try{
        await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},payload,{TTL:300,urgency:"high"});
        sent=true;delivered++;
        await admin.from("push_subscriptions").update({last_success_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",sub.id);
      }catch(error){
        const statusCode=typeof error==="object"&&error!==null&&"statusCode"in error?Number((error as {statusCode?:unknown}).statusCode):0;
        if(statusCode===404||statusCode===410){stale++;await admin.from("push_subscriptions").delete().eq("id",sub.id);}
      }
    }
    if(sent){processed++;await admin.from("reminders").update({notified_at:new Date().toISOString()}).eq("id",reminder.id).is("notified_at",null);}
  }
  return Response.json({processed,delivered,stale,due:due.length},{headers:cors});
});