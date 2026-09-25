"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import InstallPrompt from "@/components/install-prompt";

type PlanKey = "premium" | "gold" | "elite";
type Tab = "home" | "assistant" | "tasks" | "calendar" | "notes" | "reminders" | "goals" | "profile" | "premium";
type Task = { id:string; title:string; description:string|null; due_at:string|null; completed_at:string|null; priority:string };
type EventItem = { id:string; title:string; description:string|null; starts_at:string; ends_at:string; location:string|null };
type Note = { id:string; title:string; content:string; created_at:string; updated_at:string };
type Reminder = { id:string; title:string; remind_at:string; completed_at:string|null; notified_at?:string|null };
type Goal = { id:string; title:string; description:string|null; target_date:string|null; completed_at:string|null };
type Conversation = { id:string; title:string; updated_at:string; created_at:string };
type Message = { id:string; role:"user"|"assistant"; content:string; created_at:string };

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}
type SpeechRecognitionInstance = {
  lang:string;
  interimResults:boolean;
  continuous:boolean;
  onresult:((event:{results:ArrayLike<{0:{transcript:string}} & ArrayLike<{transcript:string}>>})=>void)|null;
  onend:(()=>void)|null;
  onerror:((event:{error:string})=>void)|null;
  start:()=>void;
  stop:()=>void;
};

function supabase(){ return createClient(); }

const PLANS = [
  { key:"premium" as PlanKey, name:"Premium", price:1000, tagline:"Smart everyday assistance", features:["NEXA AI assistant","Tasks & reminders","Calendar & planning","Notes & goals"] },
  { key:"gold" as PlanKey, name:"Gold", price:3000, tagline:"More power for busy days", features:["Everything in Premium","Advanced planning","Priority AI access","More automation"] },
  { key:"elite" as PlanKey, name:"Elite", price:5000, tagline:"Full NEXA experience", features:["Everything in Gold","Highest AI tier","Priority support","Ad-free experience"] }
];

function Orb({small=false}:{small?:boolean}) {
  return <div className={"orb "+(small?"orbSmall":"")}><span>N</span></div>;
}
function Icon({children}:{children:React.ReactNode}) { return <span className="iconBox">{children}</span>; }
function formatTime(value:string){ return new Date(value).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}); }
function formatDate(value:string){ return new Date(value).toLocaleDateString([], {month:"short", day:"numeric"}); }
function isToday(value:string){ return new Date(value).toDateString()===new Date().toDateString(); }
const NEXA_VAPID_PUBLIC_KEY="BKuJo8QKGFW_sJhue7Z_elbTZO6_hfKj433TYxKOkUFtVLzennx6rsNyCuQeq_h9EpKnW5vSsDMZ5yYESUS3rAA";
function urlBase64ToUint8Array(value:string){const padding="=".repeat((4-(value.length%4))%4);const base64=(value+padding).replace(/-/g,"+").replace(/_/g,"/");const raw=window.atob(base64);return Uint8Array.from(Array.from(raw).map(char=>char.charCodeAt(0)));}
function whatsapp(){ window.open("https://wa.me/2349042987385","_blank","noopener,noreferrer"); }

function BottomNav({tab,setTab}:{tab:Tab;setTab:(tab:Tab)=>void}) {
  const items:[Tab,string,string][] = [["home","⌂","Home"],["tasks","✓","Tasks"],["assistant","N","NEXA"],["calendar","▣","Calendar"],["profile","♙","Profile"]];
  return <nav className="bottomNav">
    {items.map(([id,icon,label]) =>
      <button key={id} className={tab===id?"navItem active":id==="assistant"?"navItem navCenter":"navItem"} onClick={()=>setTab(id)}>
        {id==="assistant"?<Orb small/>:<span className="navGlyph">{icon}</span>}
        <small>{label}</small>
      </button>
    )}
  </nav>;
}

function Header({title,subtitle,onBack}:{title:string;subtitle?:string;onBack?:()=>void}) {
  return <header className="pageHeader">
    {onBack ? <button className="backButton" onClick={onBack}>‹</button> : <div className="headerSpacer"/>}
    <div className="headerCopy"><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>
    <div className="headerSpacer"/>
  </header>;
}

function Home({name,tasks,events,setTab}:{name:string;tasks:Task[];events:EventItem[];setTab:(tab:Tab)=>void}) {
  const todayEvents=events.filter(e=>isToday(e.starts_at)).sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
  const openTasks=tasks.filter(t=>!t.completed_at).length;
  return <div className="screen scrollScreen">
    <div className="homeTop">
      <div><span className="eyebrow">Good day,</span><h1>{name||"there"} <span className="crown">✦</span></h1><p>Everything you need, in one calm place.</p></div>
      <button className="avatar" onClick={()=>setTab("profile")}>{(name||"N").slice(0,1).toUpperCase()}</button>
    </div>
    <button className="heroCard" onClick={()=>setTab("assistant")}>
      <div className="heroOrb"><Orb small/></div>
      <div className="heroText"><strong>Your NEXA assistant is ready</strong><span>{openTasks} open task{openTasks===1?"":"s"} · Ask, plan, remember.</span></div>
      <b>›</b>
    </button>
    <section className="section">
      <div className="sectionTitle"><h3>Quick actions</h3></div>
      <div className="quickGrid">
        {[["✧","Talk to NEXA","assistant"],["✓","Tasks","tasks"],["✎","Notes","notes"],["◷","Reminders","reminders"]].map(([icon,title,target])=>
          <button key={title} className="quickCard" onClick={()=>setTab(target as Tab)}><Icon>{icon}</Icon><span>{title}</span></button>
        )}
      </div>
    </section>
    <section className="section">
      <div className="sectionTitle"><h3>Today</h3><button onClick={()=>setTab("calendar")}>View calendar</button></div>
      <div className="stack">
        {todayEvents.length===0?<div className="emptyState"><span>Nothing scheduled today.</span><button onClick={()=>setTab("assistant")}>Ask NEXA to plan it</button></div>:
          todayEvents.slice(0,4).map(e=><div className="listRow" key={e.id}><span className="dot blue"/><div><strong>{e.title}</strong><small>{formatTime(e.starts_at)} – {formatTime(e.ends_at)}</small></div></div>)}
      </div>
    </section>
    <section className="section bottomSpace">
      <div className="sectionTitle"><h3>Need something?</h3></div>
      <div className="supportCard"><Icon>?</Icon><div><strong>NEXA Support</strong><small>Chat with Samzy Technology on WhatsApp</small></div><button onClick={whatsapp}>Open</button></div>
    </section>
  </div>;
}

function Assistant({userId,onChanged}:{userId:string;onChanged:()=>void}) {
  const [messages,setMessages]=useState<Message[]>([]);
  const [conversations,setConversations]=useState<Conversation[]>([]);
  const [conversationId,setConversationId]=useState<string|null>(null);
  const [text,setText]=useState("");
  const [busy,setBusy]=useState(false);
  const [showHistory,setShowHistory]=useState(false);
  const [voiceMode,setVoiceMode]=useState(false);
  const [listening,setListening]=useState(false);
  const [voiceError,setVoiceError]=useState("");

  async function loadConversations() {
    const {data}=await supabase().from("conversations").select("id,title,updated_at,created_at").eq("user_id",userId).order("updated_at",{ascending:false}).limit(50);
    setConversations((data||[]) as Conversation[]);
    return data as Conversation[]|null;
  }
  async function loadMessages(id:string) {
    const {data}=await supabase().from("messages").select("id,role,content,created_at").eq("conversation_id",id).in("role",["user","assistant"]).order("created_at",{ascending:true}).limit(100);
    setMessages((data||[]) as Message[]);
  }
  useEffect(()=>{(async()=>{const data=await loadConversations();if(data?.[0]){setConversationId(data[0].id);await loadMessages(data[0].id);}})()},[userId]);

  function speak(reply:string) {
    if(!voiceMode || typeof window==="undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(reply);
    utterance.rate=0.96; utterance.pitch=1.02; utterance.volume=1; utterance.onend=()=>{if(voiceMode) window.setTimeout(()=>startVoice(),250);};
    const voices=window.speechSynthesis.getVoices();
    const preferred=voices.find(v=>/^en/i.test(v.lang) && /natural|enhanced|neural|online/i.test(v.name)) || voices.find(v=>/^en/i.test(v.lang));
    if(preferred) utterance.voice=preferred;
    window.speechSynthesis.speak(utterance);
  }

  async function send(value=text) {
    const message=value.trim(); if(!message||busy) return;
    setText(""); setBusy(true); setVoiceError("");
    setMessages(m=>[...m,{id:crypto.randomUUID(),role:"user",content:message,created_at:new Date().toISOString()}]);
    const {data,error}=await supabase().functions.invoke("nexa-assistant",{body:{message,...(conversationId?{conversation_id:conversationId}:{})}});
    if(error||!data?.reply) {
      const detail=data?.error || error?.message || "The assistant could not respond right now.";
      setMessages(m=>[...m,{id:crypto.randomUUID(),role:"assistant",content:detail,created_at:new Date().toISOString()}]);
    } else {
      if(data.conversation_id) setConversationId(data.conversation_id);
      setMessages(m=>[...m,{id:data.message_id||crypto.randomUUID(),role:"assistant",content:data.reply,created_at:new Date().toISOString()}]);
      speak(data.reply);
      await loadConversations();
      onChanged();
    }
    setBusy(false);
  }

  function startVoice() {
    const Recognition=window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!Recognition){ setVoiceError("Voice input is not supported in this browser. Use Chrome on Android or Safari on iPhone."); return; }
    setVoiceError(""); setVoiceMode(true); setListening(true);
    const recognition=new Recognition();
    recognition.lang="en-NG"; recognition.interimResults=false; recognition.continuous=false;
    recognition.onresult=(event)=>{ const transcript=event.results[0][0].transcript; setListening(false); void send(transcript); };
    recognition.onend=()=>setListening(false);
    recognition.onerror=(event)=>{setListening(false);setVoiceError(event.error==="not-allowed"?"Microphone permission was denied. Allow microphone access in the browser.":"Voice input stopped. Please try again.");};
    recognition.start();
  }

  async function selectConversation(id:string) { setConversationId(id);setShowHistory(false);await loadMessages(id); }
  function newConversation(){setConversationId(null);setMessages([]);setShowHistory(false);}

  return <div className="screen assistantScreen">
    <div className="assistantTop">
      <div><span className="assistantKicker">PERSONAL ASSISTANT</span><h2>NEXA</h2><small><i/>Ready</small></div>
      <div className="assistantActions"><button onClick={()=>setShowHistory(true)}>☰<span>History</span></button><button onClick={newConversation}>＋<span>New</span></button></div>
    </div>
    <div className="assistantScroll">
      {messages.length===0?<div className="welcome">
        <Orb/><h1>Talk to NEXA</h1><p>Ask a question, plan your day, create a task, set a reminder, or save a note.</p>
        <div className="suggestionGrid">
          {["Plan my day","Create a reminder","Organize my tasks","Save a note"].map(s=><button key={s} onClick={()=>send(s)}>{s}<span>→</span></button>)}
        </div>
      </div>:<div className="messageList">{messages.map(m=><div className={m.role==="user"?"userBubble":"aiBubble"} key={m.id}><small>{m.role==="user"?"You":"NEXA"}</small><div>{m.content}</div></div>)}{busy&&<div className="aiBubble typing"><small>NEXA</small><div>Thinking…</div></div>}</div>}
      {voiceError&&<div className="voiceError">{voiceError}</div>}
    </div>
    <div className="voiceDock">
      <button className={listening?"voiceButton listening":"voiceButton"} onClick={startVoice}><span>◉</span><div><strong>{listening?"Listening…":"Talk to NEXA"}</strong><small>Voice conversation</small></div></button>
      <button className={voiceMode?"voiceToggle active":"voiceToggle"} onClick={()=>setVoiceMode(v=>!v)}>{voiceMode?"🔊":"🔈"}</button>
    </div>
    <div className="composer"><input value={text} onChange={e=>setText(e.target.value)} placeholder="Message NEXA…" onKeyDown={e=>{if(e.key==="Enter")void send()}}/><button onClick={()=>void send()} disabled={busy}>➤</button></div>
    {showHistory&&<div className="sheetBackdrop" onMouseDown={()=>setShowHistory(false)}><aside className="sheet" onMouseDown={e=>e.stopPropagation()}><div className="sheetHead"><h3>Chat history</h3><button onClick={()=>setShowHistory(false)}>×</button></div><button className="newChatRow" onClick={newConversation}>＋ New conversation</button><div className="historyList">{conversations.length===0?<div className="emptyState">No conversations yet.</div>:conversations.map(c=><button className={conversationId===c.id?"historyRow active":"historyRow"} key={c.id} onClick={()=>void selectConversation(c.id)}><div><strong>{c.title||"New conversation"}</strong><small>{formatDate(c.updated_at)}</small></div><span>›</span></button>)}</div></aside></div>}
  </div>;
}

function Tasks({tasks,onComplete,onAdd}:{tasks:Task[];onComplete:(id:string)=>void;onAdd:()=>void}) {
  const [filter,setFilter]=useState<"today"|"upcoming"|"completed">("today");
  const visible=tasks.filter(t=>filter==="completed"?!!t.completed_at:filter==="upcoming"?!!t.due_at&&!t.completed_at&&!isToday(t.due_at):!t.completed_at&&(!t.due_at||isToday(t.due_at)));
  return <div className="screen scrollScreen"><Header title="Tasks" subtitle="A clear list for a clear mind."/><button className="floatingAdd" onClick={onAdd}>＋</button>
    <div className="pillRow">{(["today","upcoming","completed"] as const).map(x=><button key={x} className={filter===x?"selected":""} onClick={()=>setFilter(x)}>{x[0].toUpperCase()+x.slice(1)}</button>)}</div>
    <div className="stack">{visible.length===0?<div className="emptyState"><span>Nothing here yet.</span><button onClick={onAdd}>Add a task</button></div>:visible.map(t=><button className="taskCard" key={t.id} onClick={()=>!t.completed_at&&onComplete(t.id)}><span className={t.completed_at?"check done":t.priority==="high"?"check high":t.priority==="urgent"?"check urgent":"check" }>{t.completed_at?"✓":""}</span><div><strong>{t.title}</strong><small>{t.due_at?formatDate(t.due_at)+" · "+formatTime(t.due_at):"No due time"}</small></div><span>›</span></button>)}</div>
  </div>;
}

function Calendar({events}:{events:EventItem[]}) {
  const [cursor,setCursor]=useState(new Date()); const [selected,setSelected]=useState(new Date());
  const year=cursor.getFullYear(),month=cursor.getMonth(),days=new Date(year,month+1,0).getDate(),first=new Date(year,month,1).getDay();
  const selectedEvents=events.filter(e=>new Date(e.starts_at).toDateString()===selected.toDateString()).sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
  return <div className="screen scrollScreen"><Header title="Calendar" subtitle="Your time, your power."/>
    <div className="calendarCard"><div className="calendarTitle"><button onClick={()=>setCursor(new Date(year,month-1,1))}>‹</button><strong>{cursor.toLocaleString("en-US",{month:"long",year:"numeric"})}</strong><button onClick={()=>setCursor(new Date(year,month+1,1))}>›</button></div>
      <div className="weekRow">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><span key={d}>{d}</span>)}</div>
      <div className="dayGrid">{Array.from({length:first+days},(_,i)=>i<first?<span key={i}/>:<button key={i} className={new Date(year,month,i-first+1).toDateString()===selected.toDateString()?"selectedDay":""} onClick={()=>setSelected(new Date(year,month,i-first+1))}>{i-first+1}</button>)}</div>
    </div>
    <h3 className="dateHeading">{selected.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</h3>
    <div className="stack">{selectedEvents.length===0?<div className="emptyState">No events for this day.</div>:selectedEvents.map(e=><div className="eventCard" key={e.id}><span className="dot purple"/><div><strong>{e.title}</strong><small>{formatTime(e.starts_at)} – {formatTime(e.ends_at)}{e.location?" · "+e.location:""}</small></div></div>)}</div>
  </div>;
}

function Notes({userId}:{userId:string}) {
  const [notes,setNotes]=useState<Note[]>([]); const [selected,setSelected]=useState<Note|null>(null); const [saving,setSaving]=useState(false);
  async function load(){const {data}=await supabase().from("notes").select("id,title,content,created_at,updated_at").eq("user_id",userId).order("updated_at",{ascending:false}).limit(100);setNotes((data||[]) as Note[]);}
  useEffect(()=>{void load()},[userId]);
  async function save(){if(!selected?.title.trim()&&!selected?.content.trim())return;setSaving(true);if(selected.id.startsWith("new-")){const {data}=await supabase().from("notes").insert({user_id:userId,title:selected.title.trim()||"Untitled note",content:selected.content}).select().single();if(data)setSelected(data as Note);}else{const {data}=await supabase().from("notes").update({title:selected.title.trim()||"Untitled note",content:selected.content,updated_at:new Date().toISOString()}).eq("id",selected.id).eq("user_id",userId).select().single();if(data)setSelected(data as Note);}await load();setSaving(false);}
  async function remove(){if(!selected)return;await supabase().from("notes").delete().eq("id",selected.id).eq("user_id",userId);setSelected(null);await load();}
  function create(){setSelected({id:"new-"+crypto.randomUUID(),title:"",content:"",created_at:new Date().toISOString(),updated_at:new Date().toISOString()});}
  return <div className="screen scrollScreen"><Header title="Notes" subtitle="Your private digital notepad."/>
    <div className="notesToolbar"><button className="primarySmall" onClick={create}>＋ New note</button>{selected&&<><button className="ghostSmall" onClick={()=>void save()}>{saving?"Saving…":"Save"}</button><button className="dangerSmall" onClick={()=>void remove()}>Delete</button></>}</div>
    {selected?<div className="noteEditor"><input value={selected.title} onChange={e=>setSelected({...selected,title:e.target.value})} placeholder="Note title"/><textarea value={selected.content} onChange={e=>setSelected({...selected,content:e.target.value})} placeholder="Write anything…"/><small>Autosave is manual so you stay in control.</small></div>:<div className="notesGrid">{notes.length===0?<div className="emptyState">No notes yet. Create your first note.</div>:notes.map(n=><button className="noteCard" key={n.id} onClick={()=>setSelected(n)}><div className="notePin">✎</div><strong>{n.title||"Untitled note"}</strong><p>{n.content||"Empty note"}</p><small>Updated {formatDate(n.updated_at)}</small></button>)}</div>}
  </div>;
}

function Reminders({userId}:{userId:string}) {
  const [items,setItems]=useState<Reminder[]>([]); const [permission,setPermission]=useState<string>("default"); const [pushEnabled,setPushEnabled]=useState(false); const [pushMessage,setPushMessage]=useState(""); const [showAdd,setShowAdd]=useState(false);
  async function load(){const {data}=await supabase().from("reminders").select("id,title,remind_at,completed_at,notified_at").eq("user_id",userId).order("remind_at",{ascending:true}).limit(100);setItems((data||[]) as Reminder[]);}
  async function enablePush(){
    setPushMessage("");
    if(!("Notification" in window)||!("serviceWorker" in navigator)||!("PushManager" in window)){setPushMessage("This browser does not support background alarm notifications.");return;}
    const permissionResult=await Notification.requestPermission();
    setPermission(permissionResult);
    if(permissionResult!=="granted"){setPushMessage("Notification permission is required for alarms when NEXA is closed.");return;}
    try{
      const registration=await navigator.serviceWorker.register("/sw.js");
      const ready=await navigator.serviceWorker.ready;
      let subscription=await ready.pushManager.getSubscription();
      if(!subscription) subscription=await ready.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(NEXA_VAPID_PUBLIC_KEY)});
      const json=subscription.toJSON();
      const endpoint=subscription.endpoint;
      const p256dh=json.keys?.p256dh;
      const auth=json.keys?.auth;
      if(!endpoint||!p256dh||!auth) throw new Error("Could not read the push subscription.");
      const {error}=await supabase().from("push_subscriptions").upsert({user_id:userId,endpoint,p256dh,auth,user_agent:navigator.userAgent,updated_at:new Date().toISOString()},{onConflict:"endpoint"});
      if(error) throw error;
      setPushEnabled(true);
      setPushMessage("Background alarms are enabled. NEXA can alert you even when the app is closed.");
    }catch(error){
      setPushMessage(error instanceof Error?error.message:"Could not enable background alarms.");
    }
  }
  async function fallbackDueReminders(){
    if(!("Notification" in window)||Notification.permission!=="granted") return;
    const now=new Date().toISOString();
    const {data}=await supabase().from("reminders").select("id,title,remind_at").eq("user_id",userId).is("completed_at",null).is("notified_at",null).lte("remind_at",now).limit(10);
    for(const reminder of (data||[]) as {id:string;title:string;remind_at:string}[]){
      new Notification("NEXA reminder",{body:reminder.title,tag:"nexa-reminder-"+reminder.id,requireInteraction:true});
      await supabase().from("reminders").update({notified_at:new Date().toISOString()}).eq("id",reminder.id).eq("user_id",userId).is("notified_at",null);
    }
    if(data?.length) await load();
  }
  useEffect(()=>{
    void load();
    if("Notification" in window)setPermission(Notification.permission);
    if("serviceWorker" in navigator) navigator.serviceWorker.ready.then(reg=>reg.pushManager.getSubscription()).then(sub=>setPushEnabled(Boolean(sub))).catch(()=>undefined);
    void fallbackDueReminders();
    const interval=window.setInterval(()=>{void fallbackDueReminders()},30000);
    return()=>window.clearInterval(interval);
  },[userId]);
  async function complete(id:string){await supabase().from("reminders").update({completed_at:new Date().toISOString()}).eq("id",id).eq("user_id",userId);await load();}
  return <div className="screen scrollScreen"><Header title="Reminders" subtitle="Set it once. NEXA keeps watch."/>
    <div className="reminderIntro"><div><strong>{pushEnabled?"Background alarms active":"Alarm-style alerts"}</strong><span>{pushEnabled?"NEXA can send push alerts even when the app is closed.":"Enable notifications and push once so reminders can reach you when NEXA is closed."}</span></div><button onClick={()=>void enablePush()}>{pushEnabled?"Enabled":"Enable alarms"}</button></div>
    {pushMessage&&<div className="emptyState">{pushMessage}</div>}
    <button className="primaryWide" onClick={()=>setShowAdd(true)}>＋ Set a reminder</button>
    <div className="stack">{items.length===0?<div className="emptyState">No reminders yet.</div>:items.map(r=><div className={r.completed_at?"reminderCard completed":"reminderCard"} key={r.id}><span className="alarmIcon">◷</span><div><strong>{r.title}</strong><small>{new Date(r.remind_at).toLocaleString([], {weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</small></div>{!r.completed_at&&<button onClick={()=>void complete(r.id)}>Done</button>}</div>)}</div>
    {showAdd&&<AddReminder userId={userId} onClose={()=>setShowAdd(false)} onCreated={load}/>}
  </div>;
}

function Goals({userId}:{userId:string}) {
  const [goals,setGoals]=useState<Goal[]>([]); const [title,setTitle]=useState("");
  async function load(){const {data}=await supabase().from("goals").select("id,title,description,target_date,completed_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(50);setGoals((data||[]) as Goal[]);}
  useEffect(()=>{void load()},[userId]);
  async function add(){if(!title.trim())return;await supabase().from("goals").insert({user_id:userId,title:title.trim()});setTitle("");await load();}
  async function complete(id:string){await supabase().from("goals").update({completed_at:new Date().toISOString()}).eq("id",id).eq("user_id",userId);await load();}
  return <div className="screen scrollScreen"><Header title="My Goals" subtitle="Keep the long-term picture visible."/><div className="inlineCreate"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Add a goal…"/><button onClick={()=>void add()}>Add</button></div><div className="stack">{goals.length===0?<div className="emptyState">No goals yet.</div>:goals.map(g=><button className="goalCard" key={g.id} onClick={()=>!g.completed_at&&complete(g.id)}><span className={g.completed_at?"goalCheck done":"goalCheck"}>{g.completed_at?"✓":""}</span><div><strong>{g.title}</strong><small>{g.target_date?"Target "+formatDate(g.target_date):"No target date"}</small></div></button>)}</div></div>;
}

function Profile({name,email,setTab,onSignOut}:{name:string;email:string;setTab:(tab:Tab)=>void;onSignOut:()=>void}) {
  const [about,setAbout]=useState(false); const [appearance,setAppearance]=useState<"midnight"|"soft">("midnight");
  useEffect(()=>{document.documentElement.dataset.theme=appearance; return()=>{delete document.documentElement.dataset.theme;}},[appearance]);
  useEffect(()=>{document.documentElement.dataset.theme=appearance; return()=>{delete document.documentElement.dataset.theme;}},[appearance]);
  return <div className="screen scrollScreen"><div className="profileHero"><div className="bigAvatar">{(name||"N").slice(0,1).toUpperCase()}</div><div><h2>{name||"NEXA user"}</h2><p>{email}</p></div></div>
    <button className="planBanner" onClick={()=>setTab("premium")}><span>♛</span><div><strong>NEXA Plans</strong><small>Premium ₦1,000 · Gold ₦3,000 · Elite ₦5,000 / month</small></div><b>›</b></button>
    <div className="settingsList">
      <button onClick={()=>setTab("goals")}><Icon>✦</Icon><div><strong>My Goals</strong><small>Set and track goals</small></div><span>›</span></button>
      <button onClick={async()=>{setTab("reminders");if("Notification" in window&&Notification.permission==="default")await Notification.requestPermission()}}><Icon>◷</Icon><div><strong>Notifications & Reminders</strong><small>Manage your alert preferences</small></div><span>›</span></button>
      <button onClick={()=>setAppearance(appearance==="midnight"?"soft":"midnight")}><Icon>◉</Icon><div><strong>Appearance</strong><small>{appearance==="midnight"?"Midnight":"Soft"} theme · tap to switch</small></div><span>↻</span></button>
      <button onClick={()=>window.alert("NEXA currently supports English. More languages can be added in a future update.")}><Icon>◎</Icon><div><strong>Language</strong><small>English</small></div><span>›</span></button>
      <button onClick={whatsapp}><Icon>?</Icon><div><strong>Help & Support</strong><small>WhatsApp · 09042987385</small></div><span>›</span></button>
      <button onClick={()=>setAbout(true)}><Icon>ⓘ</Icon><div><strong>About NEXA</strong><small>Version 1.0.0 · Built by Olanlokun Samuel</small></div><span>›</span></button>
    </div>
    <button className="logoutButton" onClick={onSignOut}>Sign out</button>
    {about&&<div className="sheetBackdrop" onMouseDown={()=>setAbout(false)}><aside className="sheet compactSheet" onMouseDown={e=>e.stopPropagation()}><div className="sheetHead"><h3>About NEXA</h3><button onClick={()=>setAbout(false)}>×</button></div><div className="aboutBody"><Orb small/><h2>NEXA</h2><p>Your personal assistant for a smarter life.</p><strong>Built by Olanlokun Samuel</strong><span>Samzy Technology</span></div></aside></div>}
  </div>;
}

function Premium({setTab}:{setTab:(tab:Tab)=>void}) {
  const [selected,setSelected]=useState<PlanKey>("gold"); const plan=PLANS.find(p=>p.key===selected)!;
  return <div className="screen premiumScreen"><div className="premiumGlow"/><button className="backButton premiumBack" onClick={()=>setTab("profile")}>‹</button><div className="premiumBrand">N E X A</div><span className="premiumCrown">♛ CHOOSE YOUR PLAN</span><h1>Unlock Your<br/>Full Potential</h1><p>Simple monthly plans for a smarter NEXA experience.</p><div className="planGrid">{PLANS.map(p=><button key={p.key} className={selected===p.key?"planCard selected":"planCard"} onClick={()=>setSelected(p.key)}><strong>{p.name}</strong><span>₦{p.price.toLocaleString("en-NG")}<small>/month</small></span><em>{p.tagline}</em></button>)}</div><ul>{plan.features.map(f=><li key={f}>✓ {f}</li>)}</ul><button className="primaryWide" onClick={()=>window.alert("Payment checkout is being connected to the Remita subscription backend.")}>Continue with {plan.name} · ₦{plan.price.toLocaleString("en-NG")}</button><button className="laterButton" onClick={()=>setTab("profile")}>Maybe later</button></div>;
}

function AddTask({userId,onClose,onCreated}:{userId:string;onClose:()=>void;onCreated:(task:Task)=>void}) {
  const [title,setTitle]=useState(""); const [due,setDue]=useState(""); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function save(e:React.FormEvent){e.preventDefault();if(!title.trim())return;setBusy(true);const {data,error}=await supabase().from("tasks").insert({user_id:userId,title:title.trim(),due_at:due?new Date(due).toISOString():null}).select().single();if(error)setError(error.message);else{onCreated(data as Task);onClose();}setBusy(false);}
  return <div className="sheetBackdrop" onMouseDown={onClose}><form className="sheet modalSheet" onSubmit={save} onMouseDown={e=>e.stopPropagation()}><div className="sheetHead"><h3>New task</h3><button type="button" onClick={onClose}>×</button></div><input required placeholder="What needs to be done?" value={title} onChange={e=>setTitle(e.target.value)}/><input type="datetime-local" value={due} onChange={e=>setDue(e.target.value)}/>{error&&<div className="formError">{error}</div>}<button className="primaryWide" disabled={busy}>{busy?"Saving…":"Add task"}</button></form></div>;
}
function AddReminder({userId,onClose,onCreated}:{userId:string;onClose:()=>void;onCreated:()=>Promise<void>}) {
  const [title,setTitle]=useState(""); const [when,setWhen]=useState(""); const [busy,setBusy]=useState(false);
  async function save(e:React.FormEvent){e.preventDefault();if(!title.trim()||!when)return;setBusy(true);await supabase().from("reminders").insert({user_id:userId,title:title.trim(),remind_at:new Date(when).toISOString()});await onCreated();setBusy(false);onClose();}
  return <div className="sheetBackdrop" onMouseDown={onClose}><form className="sheet modalSheet" onSubmit={save} onMouseDown={e=>e.stopPropagation()}><div className="sheetHead"><h3>Set reminder</h3><button type="button" onClick={onClose}>×</button></div><input required placeholder="What should NEXA remind you about?" value={title} onChange={e=>setTitle(e.target.value)}/><input required type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)}/><button className="primaryWide" disabled={busy}>{busy?"Setting…":"Set reminder"}</button></form></div>;
}

export default function Page() {
  const [intro,setIntro]=useState<"splash"|"onboarding"|"app">("splash");
  const [tab,setTab]=useState<Tab>("home");
  const [user,setUser]=useState<{id:string;name:string;email:string}|null>(null);
  const [tasks,setTasks]=useState<Task[]>([]); const [events,setEvents]=useState<EventItem[]>([]); const [loading,setLoading]=useState(true); const [dataVersion,setDataVersion]=useState(0); const [addTask,setAddTask]=useState(false);

  useEffect(()=>{const t=window.setTimeout(async()=>{const {data}=await supabase().auth.getUser();if(data.user){const name=(data.user.user_metadata?.display_name as string)||data.user.email?.split("@")[0]||"Sam";setUser({id:data.user.id,name,email:data.user.email||""});setIntro("app");}else setIntro("onboarding");setLoading(false);},650);const {data:{subscription}}=supabase().auth.onAuthStateChange((_event,session)=>{if(session?.user){const name=(session.user.user_metadata?.display_name as string)||session.user.email?.split("@")[0]||"Sam";setUser({id:session.user.id,name,email:session.user.email||""});setIntro("app");}});return()=>{clearTimeout(t);subscription.unsubscribe();};},[]);
  useEffect(()=>{if(!user)return;(async()=>{const [{data:t},{data:e},{data:p}]=await Promise.all([supabase().from("tasks").select("id,title,description,due_at,completed_at,priority").eq("user_id",user.id).order("due_at",{ascending:true,nullsFirst:false}).limit(100),supabase().from("calendar_events").select("id,title,description,starts_at,ends_at,location").eq("user_id",user.id).order("starts_at",{ascending:true}).limit(100),supabase().from("profiles").select("display_name").eq("id",user.id).maybeSingle()]);setTasks((t||[]) as Task[]);setEvents((e||[]) as EventItem[]);if(p?.display_name)setUser(u=>u?{...u,name:p.display_name}:u);})();},[user?.id,dataVersion]);
  async function completeTask(id:string){const now=new Date().toISOString();const {error}=await supabase().from("tasks").update({completed_at:now,updated_at:now}).eq("id",id).eq("user_id",user?.id);if(!error)setTasks(ts=>ts.map(t=>t.id===id?{...t,completed_at:now}:t));}
  async function signOut(){await supabase().auth.signOut();setUser(null);setIntro("onboarding");setTab("home");}
  const main=<>{tab==="home"&&<Home name={user?.name||"Sam"} tasks={tasks} events={events} setTab={setTab}/>} {tab==="assistant"&&user&&<Assistant userId={user.id} onChanged={()=>setDataVersion(v=>v+1)}/>} {tab==="tasks"&&<Tasks tasks={tasks} onComplete={completeTask} onAdd={()=>setAddTask(true)}/>} {tab==="calendar"&&<Calendar events={events}/>} {tab==="notes"&&user&&<Notes userId={user.id}/>} {tab==="reminders"&&user&&<Reminders userId={user.id}/>} {tab==="goals"&&user&&<Goals userId={user.id}/>} {tab==="profile"&&user&&<Profile name={user.name} email={user.email} setTab={setTab} onSignOut={signOut}/>} {tab==="premium"&&<Premium setTab={setTab}/>}</>;
  if(loading||intro==="splash")return <><InstallPrompt/><main className="stage"><div className="phone splash"><div className="splashGlow"/><Orb/><div className="logoText">N E X A</div><p>Your Personal Assistant<br/>for a Smarter Life</p><div className="splashTag">Organize · Plan · Achieve</div><div className="builtBy">Built by Olanlokun Samuel<span>Samzy Technology</span></div></div></main></>;
  if(!user&&intro==="onboarding")return <><InstallPrompt/><main className="stage"><div className="phone onboarding"><span className="brand">NEXA</span><div className="onboardingCopy"><span className="eyebrow">WELCOME</span><h1>More than<br/>just an <b>assistant.</b></h1><p>Stay organized, boost your productivity and handle everyday tasks in one beautiful place.</p></div><div className="deviceArt"><Orb/><span>✓</span><span>◷</span><span>✎</span></div><button className="primaryWide" onClick={()=>location.assign("/auth?mode=signup")}>Create your NEXA account <span>→</span></button><button className="secondaryLink" onClick={()=>location.assign("/auth?mode=login")}>Already have an account? <b>Log in</b></button></div></main></>;
  if(!user)return null;
  return <><InstallPrompt/><main className="appShell"><div className="phone appPhone">{main}{tab!=="premium"&&<BottomNav tab={tab} setTab={setTab}/>} {addTask&&<AddTask userId={user.id} onClose={()=>setAddTask(false)} onCreated={task=>setTasks(ts=>[task,...ts])}/>}</div></main></>;
}
