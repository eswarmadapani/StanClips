import React from "react";

export default function Page() {
  return (
    <>
      <link rel="preload" as="image" href="/brand/logo.svg" />
      <link rel="preload" as="image" href="/brand/favicon.svg" />

      {/* 1. Full-Screen Edge-to-Edge Background */}
      <div id="pageBackdrop" aria-hidden="true"><div id="homeBackdrop"></div></div>

      {/* Pixel Cursor Trail Host */}
      <div id="pixelTrailHost" aria-hidden="true"></div>

      <div id="floatingNavHost" className="floating-sidebar-container">
        <div id="nav"></div>
      </div>

      {/* 4. Application Main Content */}
      <div className="app" id="app">
        <main id="main">
          <header className="topbar">
            <span id="tpic"></span>
            <div className="titles">
              <h1 id="title"></h1>
              <p id="subtitle"></p>
            </div>
            <nav className="utabs" id="utabs" role="tablist" aria-label="Creator sections"></nav>
            <div className="row" id="actions"></div>
          </header>
          <div id="vbanner"></div>
          <div id="heroSlot"></div>
          <div className="content" id="view"></div>
        </main>
      </div>

      {/* Modals & Dialogs (Preserved exactly) */}
      <dialog id="clipdlg"></dialog>
      <dialog id="formdlg"></dialog>
      <input type="file" id="file" accept="video/*" multiple hidden />
      <div id="toasts" role="status" aria-live="polite"></div>
      <div className="pop" id="bellpop" role="dialog" aria-label="Notifications" hidden></div>
      <div className="pop menu" id="acctpop" role="menu" hidden></div>
    </>
  );
}
