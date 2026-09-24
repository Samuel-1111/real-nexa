"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPage(){
 const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState(""); const [error,setError]=useState(""); const [done,setDone]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setError("");if(password.length<8||password!==confirm){setError("Use at least 8 characters and make both passwords match.");return;}const {error}=await createClient().auth.updateUser({password});if(error)setError(error.message);else setDone(true);}
 return <main className="authShell"><div className="authCard"><div className="brand">NEXA</div>{done?<><h1>Password updated.</h1><p className="muted">Your account is secure. You can continue to NEXA.</p><button className="cta" onClick={()=>location.assign("/auth")}>Continue</button></>:<><h1>Choose a new password.</h1><form onSubmit={submit}><input required type="password" minLength={8} placeholder="New password" value={password} onChange={e=>setPassword(e.target.value)}/><input required type="password" minLength={8} placeholder="Confirm password" value={confirm} onChange={e=>setConfirm(e.target.value)}/>{error&&<div className="authError">{error}</div>}<button className="cta">Update Password</button></form></>}</div></main>
}
