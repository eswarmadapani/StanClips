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
<h2 id={"h"}></h2><p id={"p"}></p>
<a className={"btn"} id={"google"} href={"/auth/google/start"} hidden={true}>
<svg className={"g"} viewBox={"0 0 48 48"} aria-hidden={"true"}><path fill={"#EA4335"} d={"M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.7 17.7 9.5 24 9.5z"}></path><path fill={"#4285F4"} d={"M46.6 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"}></path><path fill={"#FBBC05"} d={"M10.5 28.6A14.5 14.5 0 0 1 9.7 24c0-1.6.3-3.2.8-4.6l-7.9-6.2A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.2z"}></path><path fill={"#34A853"} d={"M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z"}></path></svg>
<span id={"gtext"}></span></a>
<div className={"or"} id={"or"} hidden={true}>or use your email</div>
<form id={"f"} noValidate={true}>
<div className={"err"} id={"err"} role={"alert"}></div>
<label id={"namebox"}>Your name<input id={"name"} autoComplete={"name"} placeholder={"What should we call you?"} maxLength={80}/></label>
<label>Email<input id={"email"} type={"email"} autoComplete={"email"} placeholder={"you@example.com"} required={true}/></label>
<label><span className={"pwrow"}>Password<a href={"/reset"} id={"forgot"}>Forgot password?</a></span><span className={"pwbox"}><input id={"password"} type={"password"} required={true} minLength={8} placeholder={"Your password"}/><button type={"button"} id={"pwshow"} aria-label={"Show password"} aria-pressed={"false"}><svg viewBox={"0 0 256 256"} aria-hidden={"true"}><path d={"M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"}></path></svg></button></span><span className={"hint"} id={"pwhint"}>At least 8 characters.</span></label>
<button className={"btn primary"} id={"go"}></button>
</form>
<p className={"legal"} id={"legal"}>By continuing you agree to our <a href={"/terms"}>Terms</a> and <a href={"/privacy"}>Privacy Policy</a>.</p>
<p className={"swap"} id={"swap"}></p>
</div></main>

</>}
