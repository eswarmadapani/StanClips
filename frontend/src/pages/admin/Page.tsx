import React from "react";
export default function Page(){return <>

<div className={"app"}>
<aside className={"side"} aria-label={"Sidebar"}>
<div className={"side-head"}><img className={"logo"} src={"/brand/logo.svg"} alt={"Stan Clips"}/></div>
<nav className={"nav"} id={"nav"} aria-label={"Admin"}></nav>
<div className={"side-foot"} id={"foot"}></div>
</aside>
<main id={"main"}>
<header className={"topbar"}><div className={"titles"}><h1 id={"title"}>Admin</h1><p id={"subtitle"}></p></div><div className={"row"} id={"actions"}></div></header>
<div className={"content"} id={"view"}><div className={"empty"}>Loading…</div></div>
</main>
</div>
<dialog id={"dlg"}></dialog>
<div id={"toasts"} role={"status"} aria-live={"polite"}></div>

</>}
