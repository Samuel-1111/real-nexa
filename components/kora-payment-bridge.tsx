"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

declare global { interface Window { Korapay?: { initialize:(options:Record<string,unknown>)=>void; close?:()=>void; }; } }
const KORA_SCRIPT="https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js";
const FUNCTIONS="https://yymlkzarekwlqzvsafgk.supabase.co/functions/v1";
function loadKora(){return new Promise<void>((resolve,reject)=>{if(window.Korapay)return resolve();const old=document.querySelector<HTMLScriptElement>(`script[src="${KORA_SCRIPT}"]`);if(old){old.addEventListener("load",()=>resolve(),{once:true});old.addEventListener("error",()=>reject(new Error("Kora checkout could not load.")),{once:true});return;}const s=document.createElement("script");s.src=KORA_SCRIPT;s.async=true;s.onload=()=>resolve();s.onerror=()=>reject(new Error("Kora checkout could not load."));document.head.appendChild(s);});}
export default function KoraPaymentBridge(){
 const [message,setMessage]=useState(""); const original=useRef<typeof window.alert|null>(null);
 useEffect(()=>{
  const native=window.alert.bind(window); original.current=native;
  const pay=async(plan:"premium"|"gold"|"elite",amount:number)=>{try{
   setMessage("Preparing secure Kora checkout…"); const sb=createClient(); const {data:s}=await sb.auth.getSession(); const token=s.session?.access_token;if(!token)throw new Error("Please log in again before subscribing.");
   const r=await fetch(`${FUNCTIONS}/kora-payment-session`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({plan})}); const session=await r.json();if(!r.ok)throw new Error(session.error||"Could not prepare the payment.");if(Number(session.amount)!==amount)throw new Error("The selected plan amount could not be verified.");
   const c=await fetch(`${FUNCTIONS}/kora-config`,{headers:{Authorization:`Bearer ${token}`}});const config=await c.json();if(!c.ok||!config.public_key)throw new Error(config.error||"Kora public key is not configured.");
   await loadKora();if(!window.Korapay)throw new Error("Kora checkout is unavailable.");setMessage("");
   window.Korapay.initialize({key:config.public_key,reference:session.reference,amount:session.amount,currency:session.currency,customer:session.customer,notification_url:session.notification_url,narration:`NEXA ${plan} subscription`,metadata:{product:"NEXA",plan},merchant_bears_cost:true,onClose:()=>setMessage("Payment window closed. Your subscription was not changed."),onFailed:()=>setMessage("Payment failed. Your NEXA plan has not been changed."),onPending:()=>setMessage("Payment is pending. NEXA will update your plan when Kora confirms it."),onSuccess:async()=>{setMessage("Payment received. Confirming your NEXA subscription…");for(let i=0;i<10;i++){await new Promise(r=>setTimeout(r,1500));const {data}=await sb.from("subscriptions").select("plan,status,current_period_end").eq("user_id",s.session!.user.id).maybeSingle();if(data?.status==="active"&&data.plan===plan){setMessage(`NEXA ${plan.charAt(0).toUpperCase()+plan.slice(1)} is now active until ${new Date(data.current_period_end).toLocaleDateString()}.`);return;}}setMessage("Kora confirmed the payment. Your subscription is being activated; reopen NEXA shortly to see the updated plan.");}});
  }catch(e){setMessage(e instanceof Error?e.message:"Payment could not be started.");}};
  window.alert=(text?:string)=>{const value=String(text??"");if(!/Payment checkout is being connected to the Remita subscription backend\./i.test(value))return native(value);const amountMatch=value.match(/₦([\d,]+)/);const amount=amountMatch?Number(amountMatch[1].replace(/,/g,"")):0;const plan=(value.match(/with\s+(Premium|Gold|Elite)/i)?.[1]||"").toLowerCase() as "premium"|"gold"|"elite";if(!plan||!amount)return native(value);void pay(plan,amount);};
  return()=>{window.alert=native};
 },[]);
 if(!message)return null;return <div style={{position:"fixed",left:16,right:16,bottom:24,zIndex:99999,display:"flex",justifyContent:"center",pointerEvents:"none"}}><div style={{maxWidth:440,width:"100%",padding:"14px 16px",borderRadius:16,background:"rgba(4,10,24,.96)",color:"white",border:"1px solid rgba(255,255,255,.14)",boxShadow:"0 16px 50px rgba(0,0,0,.35)",fontSize:14,lineHeight:1.4,pointerEvents:"auto"}}>{message}</div></div>;
}