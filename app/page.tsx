"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Tab="home"|"assistant"|"tasks"|"calendar"|"profile"|"premium";
type PlanKey="premium"|"gold"|"elite";
type Task={id:string;title:string;description:string|null;due_at:string|null;completed_at:string|null;priority:string};
type Event={id:string;title:string;description:string|null;starts_at:string;ends_at:string;location:string|null};
type Message={id:string;role:"user"|"assistant";content:string;created_at:string};

function getSupabase(){ return createClient(); }

const PLANS:{key:PlanKey;name:string;price:number;tagline:string;features:string[]}[]=[
 {key:"premium",name:"Premium",price:1000,tagline:"Smart everyday assistance",features:["NEXA AI assistant","Tasks & reminders","Calendar & planning","Notes & goals"]},
 {key:"gold",name:"Gold",price:3000,tagline:"More power for busy days",features:["Everything in Premium","Advanced planning","Priority AI access","More automation"]},
 {key:"elite",name:"Elite",price:5000,tagline:"Full NEXA experience",features:["Everything in Gold","Highest AI tier","Priority support","Ad-free experience"]}
];

function Orb({small=false}:{small?:boolean}){return <div className={"orb "+(small?"orbSmall":"")}><span>N</span></div>}
function Icon({children}:{children:React.ReactNode}){return <div className="iconBox">{children}</div>}

function Bottom({tab,setTab}:{tab:Tab;setTab:(x:Tab)=>void}){
 return <nav className="bottom">
  <button onClick={()=>setTab("home")} className={tab==="home"?"active":""}>⌂<small>Home</small></button>
  <button onClick={()=>setTab("tasks")} className={tab==="tasks"?"active":""}>✓<small>Tasks</small></button>
  <button onClick={()=>setTab("assistant")} className="orbNav"><Orb small/></button>
  <button onClick={()=>setTab("calendar")} className={tab==="calendar"?"active":""}>▣<small>Calendar</small></button>
  <button onClick={()=>setTab("profile")} className={tab==="profile"?"active":""}>♙<small>Profile</small></button>
 </nav>
}

function TaskRow({task,onComplete}:{task:Task;onComplete:()=>void}){
 return <button className="task" onClick={onComplete}>
  <i className={task.completed_at?"done":task.priority==="high"?"pink":task.priority==="urgent"?"purple":"blue"}>{task.completed_at?"✓":""}</i>
  <div><strong>{task.title}</strong><small>{task.due_at?new Date(task.due_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"No due time"}</small></div>
 </button>
}

function Home({name,tasks,events,setTab,onComplete}:{name:string;tasks:Task[];events:Event[];setTab:(x:Tab)=>void;onComplete:(id:string)=>void}){
 const todayEvents=events.filter(e=>new Date(e.starts_at).toDateString()===new Date().toDateString()).sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
 const completed=tasks.filter(t=>t.completed_at).length;
 return <div className="screen">
  <header className="top"><span className="brand">NEXA</span><button className="avatar" onClick={()=>setTab("profile")}>{name.slice(0,1).toUpperCase()}</button></header>
  <section><p className="eyebrow">Good Morning,</p><h1>{name||"Sam"} <b>♛</b></h1><p className="muted">Here's what's happening today.</p></section>
  <button className="heroCard" onClick={()=>setTab("tasks")}><div className="spark">✦</div><div><strong>You're on track!</strong><span>{completed} task{completed===1?"":"s"} completed</span></div><b>›</b></button>
  <div className="quickGrid">
   {[["✧","Chat","assistant"],["✓","Tasks","tasks"],["▣","Calendar","calendar"],["•••","More","profile"]].map(([icon,title,tab])=><button key={title} onClick={()=>setTab(tab as Tab)}><Icon>{icon}</Icon><span>{title}</span></button>)}
  </div>
  <div className="sectionHead"><h2>Today's Schedule</h2><button onClick={()=>setTab("calendar")}>View all</button></div>
  <div className="schedule">
   {todayEvents.length===0?<div className="empty">No events scheduled today.</div>:todayEvents.slice(0,4).map(e=><div className="scheduleRow" key={e.id}><i className="done"/><div><strong>{e.title}</strong><small>{new Date(e.starts_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} - {new Date(e.ends_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</small></div><span>›</span></div>)}
  </div>
 </div>
}

function Assistant({userId}:{userId:string}){
 const [messages,setMessages]=useState<Message[]>([]); const [text,setText]=useState(""); const [busy,setBusy]=useState(false);
 useEffect(()=>{(async()=>{const {data:c}=await getSupabase().from("conversations").select("id").eq("user_id",userId).order("updated_at",{ascending:false}).limit(1).maybeSingle();if(c){const {data:m}=await getSupabase().from("messages").select("id,role,content,created_at").eq("conversation_id",c.id).in("role",["user","assistant"]).order("created_at",{ascending:true}).limit(80);setMessages((m||[]) as Message[])}})()},[userId]);
 async function send(value=text){
  const message=value.trim();if(!message||busy)return;setText("");setBusy(true);
  const optimistic:Message={id:crypto.randomUUID(),role:"user",content:message,created_at:new Date().toISOString()};setMessages(m=>[...m,optimistic]);
  const {data,error}=await getSupabase().functions.invoke("nexa-assistant",{body:{message}});
  if(error){setMessages(m=>[...m,{id:crypto.randomUUID(),role:"assistant",content:"I couldn't complete that request. Please try again.",created_at:new Date().toISOString()}]);}
  else if(data?.reply){setMessages(m=>[...m,{id:data.message_id||crypto.randomUUID(),role:"assistant",content:data.reply,created_at:new Date().toISOString()}]);}
  setBusy(false);
 }
 const quick=[["✎","Plan my day","Create a schedule for me"],["◷","Set a reminder","Don't let me forget anything"],["✓","Help with my tasks","Organize my to-do list"],["✦","Answer a question","Ask me anything"]];
 return <div className="screen assistantScreen">
  <header className="assistantHead"><button>‹</button><div><strong>NEXA Assistant</strong><small><i/> Online</small></div><button>⚙</button></header>
  <div className="assistantBody">
   <Orb/><h2>Hi there! 👋</h2><p>I'm NEXA, your personal assistant.<br/>How can I help you today?</p>
   {messages.length===0&&quick.map(([icon,title,sub])=><button className="prompt" key={title} onClick={()=>send(title)}><Icon>{icon}</Icon><div><strong>{title}</strong><small>{sub}</small></div></button>)}
   <div className="messages">{messages.map(m=><div className={m.role==="user"?"userMsg":"aiMsg"} key={m.id}>{m.content}</div>)}{busy&&<div className="aiMsg typing">NEXA is thinking…</div>}</div>
  </div>
  <div className="composer"><input value={text} onChange={e=>setText(e.target.value)} placeholder="Type your message..." onKeyDown={e=>{if(e.key==="Enter")send()}}/><button disabled={busy} onClick={()=>send()}>➤</button></div>
 </div>
}

function Tasks({tasks,onComplete,onAdd}:{tasks:Task[];onComplete:(id:string)=>void;onAdd:()=>void}){
 const [filter,setFilter]=useState<"today"|"upcoming"|"completed">("today");
 const visible=tasks.filter(t=>filter==="completed"?!!t.completed_at:filter==="upcoming"?!!t.due_at&&!t.completed_at&&!isToday(t.due_at):!t.completed_at&&( !t.due_at||isToday(t.due_at)));
 return <div className="screen"><header className="pageHead"><div><h2>Tasks</h2><p>Get things done, one step at a time.</p></div><button className="plus" onClick={onAdd}>+</button></header>
  <div className="pills">{(["today","upcoming","completed"] as const).map(x=><button className={filter===x?"selected":""} key={x} onClick={()=>setFilter(x)}>{x[0].toUpperCase()+x.slice(1)}</button>)}</div>
  <div className="taskList">{visible.length===0?<div className="empty">Nothing here yet.</div>:visible.map(t=><TaskRow task={t} key={t.id} onComplete={()=>!t.completed_at&&onComplete(t.id)}/>)}</div>
 </div>
}
function isToday(value:string){return new Date(value).toDateString()===new Date().toDateString()}

function Calendar({events}:{events:Event[]}){
 const [cursor,setCursor]=useState(new Date()); const [selected,setSelected]=useState(new Date());
 const year=cursor.getFullYear(),month=cursor.getMonth(),days=new Date(year,month+1,0).getDate(),first=new Date(year,month,1).getDay();
 const selectedEvents=events.filter(e=>new Date(e.starts_at).toDateString()===selected.toDateString()).sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
 return <div className="screen"><header className="pageHead"><div><h2>Calendar</h2><p>Your time, your power.</p></div></header>
  <div className="calendar"><div className="calTitle"><button onClick={()=>setCursor(new Date(year,month-1,1))}>‹</button><strong>{cursor.toLocaleString("en-US",{month:"long",year:"numeric"})}</strong><button onClick={()=>setCursor(new Date(year,month+1,1))}>›</button></div>
   <div className="week">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x=><span key={x}>{x}</span>)}</div>
   <div className="days">{Array.from({length:first+days},(_,i)=>i<first? <span key={i}/> : <button key={i} className={new Date(year,month,i-first+1).toDateString()===selected.toDateString()?"today":""} onClick={()=>setSelected(new Date(year,month,i-first+1))}>{i-first+1}</button>)}</div>
  </div>
  <h3 className="dateTitle">{selected.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</h3>
  <div className="agenda">{selectedEvents.length===0?<div className="empty">No events for this day.</div>:selectedEvents.map(e=><div key={e.id}><i className="blue"/><span><strong>{e.title}</strong><small>{new Date(e.starts_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} - {new Date(e.ends_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</small></span></div>)}</div>
 </div>
}

function Profile({name,email,setTab,onSignOut}:{name:string;email:string;setTab:(x:Tab)=>void;onSignOut:()=>void}){
 return <div className="screen"><div className="profileTop"><div className="bigAvatar">{name.slice(0,1).toUpperCase()}</div><div><h2>{name||"Sam"}</h2><small>{email}</small></div></div>
  <button className="premiumRow" onClick={()=>setTab("premium")}><span>♛</span><div><strong>NEXA Plans</strong><small>Premium ₦1,000 · Gold ₦3,000 · Elite ₦5,000 / month</small></div>›</button>
  <div className="settings">{[["✦","My Goals","Set and track your goals"],["♧","Notifications","Manage your alerts"],["◉","Appearance","Choose your theme"],["◎","Language","English"],["?","Help & Support","Get help when you need it"],["ⓘ","About NEXA","Version 1.0.0"]].map(x=><button key={x[1]}><Icon>{x[0]}</Icon><div><strong>{x[1]}</strong><small>{x[2]}</small></div><span>›</span></button>)}</div>
  <button className="logout" onClick={onSignOut}>Sign out</button>
 </div>
}
function Premium({setTab}:{setTab:(x:Tab)=>void}){
 const [selected,setSelected]=useState<PlanKey>("gold");
 const plan=PLANS.find(x=>x.key===selected)!;
 return <div className="premium">
  <div className="mountains"/>
  <span className="premiumBrand">N E X A</span>
  <b>♛ Choose Your Plan</b>
  <h1>Unlock Your<br/>Full Potential</h1>
  <p>Simple monthly plans for a smarter NEXA experience.</p>
  <div className="planGrid">{PLANS.map(x=><button key={x.key} className={"planCard "+(selected===x.key?"selected":"")} onClick={()=>setSelected(x.key)}><strong>{x.name}</strong><span>₦{x.price.toLocaleString("en-NG")}<small>/month</small></span><em>{x.tagline}</em></button>)}</div>
  <ul>{plan.features.map(x=><li key={x}>✓ {x}</li>)}</ul>
  <button className="cta" onClick={()=>alert("The plan is selected. Payment checkout will be connected when the payment provider credentials/API details are configured.")}>Continue with {plan.name} · ₦{plan.price.toLocaleString("en-NG")}</button>
  <button className="later" onClick={()=>setTab("profile")}>Maybe Later</button>
 </div>}

function AddTask({onClose,onCreated}:{onClose:()=>void;onCreated:(task:Task)=>void}){
 const [title,setTitle]=useState("");const [due,setDue]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function create(e:React.FormEvent){e.preventDefault();if(!title.trim())return;setBusy(true);const {data,error}=await getSupabase().from("tasks").insert({user_id:(await getSupabase().auth.getUser()).data.user?.id,title:title.trim(),due_at:due?new Date(due).toISOString():null}).select().single();if(error)setError(error.message);else{onCreated(data as Task);onClose()}setBusy(false)}
 return <div className="modalBackdrop" onMouseDown={onClose}><form className="modal" onSubmit={create} onMouseDown={e=>e.stopPropagation()}><div className="modalHead"><h3>New task</h3><button type="button" onClick={onClose}>×</button></div><input autoFocus required placeholder="What needs to be done?" value={title} onChange={e=>setTitle(e.target.value)}/><input type="datetime-local" value={due} onChange={e=>setDue(e.target.value)}/>{error&&<div className="authError">{error}</div>}<button className="cta" disabled={busy}>{busy?"Saving…":"Add Task"}</button></form></div>
}

export default function Page(){
 const [intro,setIntro]=useState<"splash"|"onboarding"|"app">("splash"); const [tab,setTab]=useState<Tab>("home");
 const [user,setUser]=useState<{id:string;name:string;email:string} | null>(null); const [tasks,setTasks]=useState<Task[]>([]); const [events,setEvents]=useState<Event[]>([]); const [addTask,setAddTask]=useState(false); const [loading,setLoading]=useState(true);
 useEffect(()=>{const timer=setTimeout(async()=>{const {data}=await getSupabase().auth.getUser();if(data.user){const name=(data.user.user_metadata?.display_name as string)||data.user.email?.split("@")[0]||"Sam";setUser({id:data.user.id,name,email:data.user.email||""});setIntro("app")}else setIntro("onboarding");setLoading(false)},900);const {data:{subscription}}=getSupabase().auth.onAuthStateChange((_e,s)=>{if(s?.user){const name=(s.user.user_metadata?.display_name as string)||s.user.email?.split("@")[0]||"Sam";setUser({id:s.user.id,name,email:s.user.email||""});setIntro("app")} });return()=>{clearTimeout(timer);subscription.unsubscribe()}},[]);
 useEffect(()=>{if(!user)return;(async()=>{const [{data:t},{data:e},{data:p}]=await Promise.all([getSupabase().from("tasks").select("id,title,description,due_at,completed_at,priority").eq("user_id",user.id).order("due_at",{ascending:true,nullsFirst:false}).limit(100),getSupabase().from("calendar_events").select("id,title,description,starts_at,ends_at,location").eq("user_id",user.id).order("starts_at",{ascending:true}).limit(100),getSupabase().from("profiles").select("display_name").eq("id",user.id).maybeSingle()]);setTasks((t||[]) as Task[]);setEvents((e||[]) as Event[]);if(p?.display_name&&p.display_name!==user.name)setUser(u=>u?{...u,name:p.display_name}:u)})()},[user?.id]);
 async function completeTask(id:string){const now=new Date().toISOString();const {error}=await getSupabase().from("tasks").update({completed_at:now,updated_at:now}).eq("id",id);if(!error)setTasks(ts=>ts.map(t=>t.id===id?{...t,completed_at:now}:t))}
 async function signOut(){await getSupabase().auth.signOut();setUser(null);setIntro("onboarding");setTab("home")}
 if(loading||intro==="splash")return <main className="stage"><div className="phone splash"><div className="status">9:41 <span>▮▮▮ ◼</span></div><div className="splashGlow"/><Orb/><div className="logoText">N E X A</div><p>Your Personal Assistant<br/>for a Smarter Life</p><div className="loader"/><small>Organize · Plan · Achieve</small><div className="builtBy">Built by Olanlokun Samuel<br/><span>Samzy Technology</span></div></div></main>;
 if(!user&&intro==="onboarding")return <main className="stage"><div className="phone onboarding"><div className="status">9:41 <span>▮▮▮ ◼</span></div><span className="brand">NEXA</span><h1>More than<br/>just an <b>assistant.</b></h1><p>NEXA helps you stay organized,<br/>boost your productivity and<br/>handle everyday tasks — effortlessly.</p><div className="deviceArt"><Orb/><span>▣</span><span>✉</span><span>▣</span></div><button className="cta" onClick={()=>location.assign("/auth?mode=signup")}>Get Started&nbsp; →</button><small>Already have an account? <button className="inlineLink" onClick={()=>location.assign("/auth?mode=login")}>Log In</button></small></div></main>;
 if(!user) return null;
 const currentUser=user;
 return <main className="app"><div className="phone"><div className="status">9:41 <span>▮▮▮ ◼</span></div>
  {tab==="home"&&<Home name={currentUser.name} tasks={tasks} events={events} setTab={setTab} onComplete={completeTask}/>}
  {tab==="assistant"&&<Assistant userId={currentUser.id}/>}
  {tab==="tasks"&&<Tasks tasks={tasks} onComplete={completeTask} onAdd={()=>setAddTask(true)}/>}
  {tab==="calendar"&&<Calendar events={events}/>}
  {tab==="profile"&&<Profile name={currentUser.name} email={currentUser.email} setTab={setTab} onSignOut={signOut}/>}
  {tab==="premium"&&<Premium setTab={setTab}/>}
  {tab!=="premium"&&<Bottom tab={tab} setTab={setTab}/>}
  {addTask&&<AddTask onClose={()=>setAddTask(false)} onCreated={task=>setTasks(ts=>[task,...ts])}/>}
 </div></main>
}