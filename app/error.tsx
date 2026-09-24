"use client";
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){
 return <main className="authShell"><div className="authCard"><div className="brand">NEXA</div><h1>Something went wrong.</h1><p className="muted">NEXA hit an unexpected error.</p><button className="cta" onClick={reset}>Try Again</button></div></main>
}
