import React from "react";
export default function Page(){return <>

<aside className={"side"}>
<a href={"/"} aria-label={"Stan Clips home"}><img src={"/brand/logo-light.svg"} alt={"Stan Clips"}/></a>
<div>
<h1>Clips from every stream, <em>without watching all of it.</em></h1>
<ul>
<li><svg viewBox={"0 0 256 256"} aria-hidden={"true"}><path d={"M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"}></path></svg><span>Records live streams and clips them as they happen</span></li>
<li><svg viewBox={"0 0 256 256"} aria-hidden={"true"}><path d={"M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"}></path></svg><span>Vertical shorts with word-by-word captions and a hook</span></li>
<li><svg viewBox={"0 0 256 256"} aria-hidden={"true"}><path d={"M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"}></path></svg><span>Free and open source: runs on your own AI key</span></li>
</ul>
</div>
<small>© <span id={"year"}></span> Stan Clips · <a href={"/privacy"} style={{"color": "inherit"} as React.CSSProperties}>Privacy</a> · <a href={"/terms"} style={{"color": "inherit"} as React.CSSProperties}>Terms</a></small>
</aside>
<main className={"main"}><div className={"card"}>
<a href={"/"}><img className={"mobile-logo"} src={"/brand/logo.svg"} alt={"Stan Clips"}/></a>
<h2 id={"h"}>Reset your password</h2><p id={"p"}>Enter the email you signed up with and we'll send you a link to choose a new password.</p>
<form id={"ask"} noValidate={true}>
<div className={"err"} id={"err"} role={"alert"}></div>
<label>Email<input id={"email"} type={"email"} autoComplete={"email"} placeholder={"you@example.com"} required={true}/></label>
<button className={"btn primary"} id={"go1"}>Send reset link</button>
</form>
<div id={"sent"} hidden={true}><div className={"okbox"}>If there's an account for that email, a reset link is on its way. It works for one hour. Check your spam folder if you don't see it.</div></div>
<form id={"set"} noValidate={true} hidden={true}>
<div className={"err"} id={"err2"} role={"alert"}></div>
<label>New password<input id={"pw"} type={"password"} autoComplete={"new-password"} required={true} minLength={8}/><span className={"hint"}>At least 8 characters.</span></label>
<label>Type it again<input id={"pw2"} type={"password"} autoComplete={"new-password"} required={true} minLength={8}/></label>
<button className={"btn primary"} id={"go2"}>Save new password</button>
</form>
<p className={"swap"}><a href={"/login"}>Back to sign in</a></p>
</div></main>
<style>{".okbox{background:#E9F6EE;color:#1F7A4D;padding:14px 16px;border-radius:var(--r);font-size:15px;line-height:1.5}"}</style>

</>}
