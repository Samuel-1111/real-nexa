"use client";

import { useEffect, useState } from "react";
import mammoth from "mammoth";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
type Memory = { id:string; content:string; category:string; created_at:string; updated_at:string };
type Source = { title?:string; uri?:string };

function base64(file:File){
  return new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(",")[1]||"");r.onerror=()=>reject(r.error);r.readAsDataURL(file);});
}

export default function NexaToolsPage(){
  const [tab,setTab]=useState<"files"|"search"|"memory"|"write">("files");
  const [file,setFile]=useState<File|null>(null);
  const [fileQuestion,setFileQuestion]=useState("What is inside this file? Summarize the important points clearly.");
  const [result,setResult]=useState("");
  const [sources,setSources]=useState<Source[]>([]);
  const [busy,setBusy]=useState(false);
  const [search,setSearch]=useState("");
  const [memory,setMemory]=useState("");
  const [memories,setMemories]=useState<Memory[]>([]);
  const [writeType,setWriteType]=useState("professional letter");
  const [writePrompt,setWritePrompt]=useState("");
  const [error,setError]=useState("");

  async function loadMemories(){
    const {data}=await supabase.from("nexa_memories").select("id,content,category,created_at,updated_at").order("updated_at",{ascending:false}).limit(100);
    setMemories((data||[]) as Memory[]);
  }
  useEffect(()=>{void loadMemories();},[]);

  async function ask(payload:any){
    setBusy(true);setError("");setResult("");setSources([]);
    const {data,error}=await supabase.functions.invoke("nexa-assistant",{body:payload});
    if(error||!data?.reply){setError(data?.error||error?.message||"NEXA could not complete that request.");setBusy(false);return;}
    setResult(data.reply);setSources((data.sources||[]) as Source[]);setBusy(false);
  }

  async function analyzeFile(){
    if(!file)return;
    if(file.size>12*1024*1024){setError("Please use a file smaller than 12 MB.");return;}
    let attachment:any;
    try{
      if(file.type==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"){
        const raw=await file.arrayBuffer();
        const extracted=await mammoth.extractRawText({arrayBuffer:raw});
        attachment={name:file.name,mimeType:"text/plain",text:extracted.value.slice(0,60000)};
      } else if(file.type.startsWith("text/")) {
        attachment={name:file.name,mimeType:file.type||"text/plain",text:(await file.text()).slice(0,60000)};
      } else {
        attachment={name:file.name,mimeType:file.type,data:await base64(file)};
      }
      const path=`${(await supabase.auth.getUser()).data.user?.id||"anonymous"}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
      await supabase.storage.from("nexa-files").upload(path,file,{contentType:file.type||"application/octet-stream",upsert:false});
      await ask({message:fileQuestion,attachments:[attachment]});
    }catch(e){setError(e instanceof Error?e.message:"Could not process the file.");setBusy(false);}
  }

  async function runSearch(){if(!search.trim())return;await ask({message:search.trim(),web_search:true});}
  async function saveMemory(){if(!memory.trim())return;setBusy(true);setError("");const {error}=await supabase.from("nexa_memories").insert({content:memory.trim(),category:"preference"});if(error)setError(error.message);else{setMemory("");await loadMemories();}setBusy(false);}
  async function deleteMemory(id:string){await supabase.from("nexa_memories").delete().eq("id",id);await loadMemories();}
  async function write(){if(!writePrompt.trim())return;await ask({message:`Write a ${writeType}. The user's request is: ${writePrompt}. Return only the polished, ready-to-send text. Make it natural, professional and human.`});}

  return <main style={{minHeight:"100dvh",background:"#020817",color:"#fff",padding:"20px",fontFamily:"system-ui,-apple-system,sans-serif"}}>
    <div style={{maxWidth:760,margin:"0 auto"}}>
      <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:20}}>
        <div><div style={{fontSize:12,letterSpacing:2,opacity:.65}}>NEXA</div><h1 style={{margin:"4px 0",fontSize:30}}>Assistant tools</h1><p style={{margin:0,opacity:.65}}>Files, web research, memory and writing.</p></div>
        <button onClick={()=>location.href="/"} style={button(false)}>Back</button>
      </header>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>{([["files","Files"],["search","Web"],["memory","Memory"],["write","Write"]] as const).map(([id,label])=><button key={id} onClick={()=>setTab(id)} style={button(tab===id)}>{label}</button>)}</div>

      {tab==="files"&&<section style={card}>
        <h2>Image & file understanding</h2><p style={muted}>Upload an image, PDF, Word document or TXT file. Ask NEXA what is inside, explain a worksheet, summarize a document or read important points.</p>
        <input type="file" accept="image/*,.pdf,.txt,.doc,.docx" onChange={e=>setFile(e.target.files?.[0]||null)} style={{width:"100%",margin:"12px 0"}}/>
        {file&&<div style={chip}>{file.name} · {(file.size/1024/1024).toFixed(2)} MB</div>}
        <textarea value={fileQuestion} onChange={e=>setFileQuestion(e.target.value)} style={textarea} placeholder="Ask about this file…"/>
        <button disabled={!file||busy} onClick={()=>void analyzeFile()} style={primary}>{busy?"Analyzing…":"Ask NEXA about this file"}</button>
      </section>}

      {tab==="search"&&<section style={card}>
        <h2>Web search</h2><p style={muted}>Ask for current information. NEXA will use web search and return the sources it used.</p>
        <textarea value={search} onChange={e=>setSearch(e.target.value)} style={textarea} placeholder="Search the web… e.g. What are today's latest technology headlines?"/>
        <button disabled={busy} onClick={()=>void runSearch()} style={primary}>{busy?"Searching…":"Search with NEXA"}</button>
      </section>}

      {tab==="memory"&&<section style={card}>
        <h2>Memory Manager</h2><p style={muted}>Choose what NEXA remembers. You can view or delete memories at any time.</p>
        <textarea value={memory} onChange={e=>setMemory(e.target.value)} style={textarea} placeholder="Remember that I prefer short answers."/>
        <button disabled={busy} onClick={()=>void saveMemory()} style={primary}>Save memory</button>
        <div style={{display:"grid",gap:8,marginTop:16}}>{memories.length===0?<div style={muted}>No saved memories.</div>:memories.map(m=><div key={m.id} style={{...chip,display:"flex",justifyContent:"space-between",gap:12}}><span>{m.content}</span><button onClick={()=>void deleteMemory(m.id)} style={danger}>Delete</button></div>)}</div>
      </section>}

      {tab==="write"&&<section style={card}>
        <h2>Write for me</h2><p style={muted}>NEXA can prepare polished letters, emails, WhatsApp messages, invitations, notices and other ready-to-send writing.</p>
        <select value={writeType} onChange={e=>setWriteType(e.target.value)} style={input}><option>professional letter</option><option>email</option><option>WhatsApp message</option><option>invitation letter</option><option>formal notice</option><option>birthday message</option><option>business proposal</option></select>
        <textarea value={writePrompt} onChange={e=>setWritePrompt(e.target.value)} style={textarea} placeholder="Tell NEXA who it is for, what you want to say and the tone…"/>
        <button disabled={busy} onClick={()=>void write()} style={primary}>{busy?"Writing…":"Prepare it"}</button>
      </section>}

      {error&&<div style={{...card,marginTop:12,borderColor:"#7f1d1d"}}>{error}</div>}
      {result&&<section style={{...card,marginTop:12}}><h2>Response</h2><div style={{whiteSpace:"pre-wrap",lineHeight:1.7}}>{result}</div>{sources.length>0&&<div style={{marginTop:20}}><h3>Sources</h3>{sources.map((s,i)=><a key={i} href={s.uri} target="_blank" rel="noreferrer" style={{display:"block",color:"#9cc7ff",padding:"6px 0"}}>{i+1}. {s.title||s.uri}</a>)}</div>}</section>}
    </div>
  </main>;
}

const card:React.CSSProperties={background:"rgba(255,255,255,.045)",border:"1px solid rgba(255,255,255,.1)",borderRadius:22,padding:20};
const muted:React.CSSProperties={opacity:.65,lineHeight:1.6};
const chip:React.CSSProperties={padding:"10px 12px",borderRadius:12,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.08)"};
const textarea:React.CSSProperties={width:"100%",minHeight:130,resize:"vertical",boxSizing:"border-box",background:"rgba(0,0,0,.25)",color:"white",border:"1px solid rgba(255,255,255,.12)",borderRadius:14,padding:14,margin:"10px 0",font: "inherit"};
const input:React.CSSProperties={width:"100%",boxSizing:"border-box",background:"#07122b",color:"white",border:"1px solid rgba(255,255,255,.12)",borderRadius:14,padding:14,margin:"10px 0",font:"inherit"};
const primary:React.CSSProperties={width:"100%",border:0,borderRadius:14,padding:14,background:"linear-gradient(135deg,#7c3aed,#2563eb)",color:"white",fontWeight:700,cursor:"pointer"};
const danger:React.CSSProperties={border:0,background:"transparent",color:"#ff9b9b",cursor:"pointer"};
function button(active:boolean):React.CSSProperties{return{border:"1px solid rgba(255,255,255,.12)",borderRadius:12,padding:"11px 8px",background:active?"rgba(124,58,237,.35)":"rgba(255,255,255,.05)",color:"white",fontWeight:700,cursor:"pointer"};}
