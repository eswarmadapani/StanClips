/**
 * Stan Clips UI Library Entry Point
 *
 * Core render helpers, custom web components, media viewers,
 * queue tables, and visual effects exported to window.StanUI.
 */

import React, { type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot, type Root } from "react-dom/client";

import WaveMesh from "./components/ui/wave-mesh";
import { BorderBeam } from "./components/ui/border-beam";
import { PixelCursorTrail } from "./components/ui/pixel-trail";

export { PixelCursorTrail };
export { renderSidebar } from "./sidebar";

export interface Destination {
  account_name: string;
  platform: string;
  status: string;
  url?: string;
  due_at: number;
  error?: string;
}

export interface Clip {
  id: string;
  cover?: string;
  file?: string;
  version: number;
  hook?: string;
  title?: string;
  status: string;
  score: number;
  start: number;
  end: number;
  posts?: Record<string, Destination>;
}

export interface Tools {
  clock: (time: number) => string;
  fmt: (time: number) => string;
  ic: (icon: string) => string;
  paused: boolean;
}

export interface QueuePost extends Destination {
  id: string;
  title: string;
  creator_name?: string;
  views?: number;
}

function Icon({ name, tools }: { name: string; tools: Tools }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center"
      dangerouslySetInnerHTML={{ __html: tools.ic(name) }}
    />
  );
}

export function deliveryLabel(p: Destination, tools: Tools): string {
  if (p.status === "scheduled") {
    if (tools.paused) return "Posting paused";
    if (p.error) return "Retry at " + tools.clock(p.due_at);
    if (p.due_at <= Date.now() / 1000) return "Waiting to upload";
    return "Scheduled · " + tools.clock(p.due_at);
  }

  const statusMap: Record<string, string> = {
    posting: "Uploading",
    posted: "Posted",
    failed: "Failed",
  };
  return statusMap[p.status] ?? p.status;
}

function Destinations({ clip, tools }: { clip: Clip; tools: Tools }) {
  const activePosts = Object.entries(clip.posts ?? {}).filter(([, p]) => p.status !== "cancelled");

  return (
    <>
      {activePosts.map(([id, p]) => {
        const isQueued = p.status === "scheduled";
        const label = deliveryLabel(p, tools);

        let detail = p.error;
        if (detail?.includes("Could not determine client ID from request")) {
          detail = "Restore the original Google app in Settings > Connected apps > YouTube, then retry.";
        } else if (
          detail?.includes("log in to www.instagram.com") ||
          (detail?.includes("OAuthException") && detail?.includes("190"))
        ) {
          detail = "Instagram security checkpoint: Log into www.instagram.com to verify your account, then reconnect in Settings.";
        } else if (detail?.includes("Error validating access token")) {
          detail = "Instagram session expired. Reconnect the account in Settings > Connected apps.";
        }

        const content = (
          <>
            <strong>{p.account_name}</strong>
            <span>{label}</span>
          </>
        );

        return (
          <div key={id} className="sc-destination" data-state={p.status}>
            {p.url && /^https?:\/\//i.test(p.url) ? (
              <a href={p.url} target="_blank" rel="noopener">
                {content}
              </a>
            ) : (
              <div>{content}</div>
            )}
            {detail && <small>{detail}</small>}
            {isQueued && (
              <button
                type="button"
                className="btn sm"
                data-act="clipcancel"
                data-id={id}
                aria-label={"Cancel post to " + p.account_name}
              >
                Cancel post
              </button>
            )}
            {p.status === "failed" && (
              <button
                type="button"
                className="btn sm"
                data-act="clipretry"
                data-id={id}
                aria-label={"Retry post to " + p.account_name}
              >
                Retry
              </button>
            )}
            {p.status === "failed" && detail && (
              <button
                type="button"
                className="btn sm ghost"
                data-act="copytext"
                data-t={detail}
                aria-label="Copy error"
              >
                Copy error
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}

export function postRows(clip: Clip, tools: Tools): string {
  return renderToStaticMarkup(<Destinations clip={clip} tools={tools} />);
}

export function clipCard(job: { id: string }, clip: Clip, selected: boolean, tools: Tools): string {
  const isReady = clip.status === "done";
  const isBusy = ["queued", "rendering"].includes(clip.status);
  const mediaPrefix = "/media/" + encodeURIComponent(job.id) + "/";
  const actionAttrs = { "data-j": job.id, "data-c": clip.id };
  const selectionKey = "c:" + job.id + ":" + clip.id;

  function renderActionButton(act: string, label: string, icon: string, text?: ReactNode) {
    return (
      <button
        type="button"
        className={"btn sm " + (text ? "" : "icon ghost")}
        data-act={act}
        {...actionAttrs}
        title={label}
        aria-label={label}
      >
        <Icon name={icon} tools={tools} />
        {text}
      </button>
    );
  }

  return renderToStaticMarkup(
    <article className={"clip sc-clip " + (selected ? "picked" : "")}>
      <button
        type="button"
        className="shot"
        data-act="openclip"
        {...actionAttrs}
        aria-label={"Open clip: " + (clip.title || clip.hook || clip.id)}
      >
        {isReady ? (
          <>
            <img
              loading="lazy"
              alt=""
              src={mediaPrefix + encodeURIComponent(clip.cover ?? "") + "?v=" + clip.version}
            />
            <span className="veil">
              <span>
                <Icon name="play" tools={tools} />
              </span>
            </span>
          </>
        ) : (
          <span className="making">
            {clip.status === "error"
              ? "Render failed. Open the clip to try again."
              : isBusy && clip.status === "rendering"
              ? "Rendering clip…"
              : "Waiting to render…"}
          </span>
        )}
        <span className="badge l" title="AI score">
          {clip.score || "Hand"}
        </span>
        <span className="badge r">{tools.fmt(clip.end - clip.start)}</span>
      </button>

      <div className="clip-body">
        <div className="hook">{clip.hook || "Untitled clip"}</div>
        <div className="ttl">{clip.title}</div>
        <Destinations clip={clip} tools={tools} />
        <div className="clip-foot">
          {!isBusy && (
            <label className="selck">
              <input
                type="checkbox"
                data-sel={selectionKey}
                defaultChecked={selected}
                aria-label="Select this clip"
              />
            </label>
          )}
          {isReady && (
            <a
              className="btn sm icon ghost"
              href={mediaPrefix + encodeURIComponent(clip.file ?? "") + "?download=1"}
              title="Download"
              aria-label="Download"
            >
              <Icon name="down" tools={tools} />
            </a>
          )}
          {renderActionButton("copy", "Copy post text", "copy")}
          {!isBusy && renderActionButton("delclip", "Delete this clip", "trash")}
          <span className="grow" />
          {isReady && renderActionButton("openclip", "Post", "send", "Post")}
        </div>
      </div>
    </article>
  );
}

export function stripControls(): string {
  return (
    "<stan-clip-scroll>" +
    renderToStaticMarkup(
      <div className="sc-strip-controls flex justify-end gap-2" role="group" aria-label="Clip browsing">
        <button type="button" data-step="-1" aria-label="Previous clips">
          ‹
        </button>
        <button type="button" data-step="1" aria-label="Next clips">
          ›
        </button>
      </div>
    ) +
    "</stan-clip-scroll>"
  );
}

class ClipScroll extends HTMLElement {
  private rail: HTMLElement | null = null;
  private observer = new ResizeObserver(() => this.refresh());

  private refresh = () => {
    if (!this.rail) return;
    const remaining = this.rail.scrollWidth - this.rail.clientWidth;
    this.hidden = remaining <= 1;
    const [previous, next] = this.querySelectorAll("button");
    if (previous && next) {
      previous.disabled = this.rail.scrollLeft <= 1;
      next.disabled = this.rail.scrollLeft >= remaining - 1;
    }
  };

  private move = (event: Event) => {
    const step = (event.target as Element).closest<HTMLButtonElement>("[data-step]")?.dataset.step;
    if (this.rail && step) {
      this.rail.scrollBy({
        left: Number(step) * this.rail.clientWidth * 0.88,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    }
  };

  connectedCallback() {
    queueMicrotask(() => {
      if (!this.isConnected || !(this.nextElementSibling instanceof HTMLElement)) return;
      this.rail = this.nextElementSibling;
      this.observer.observe(this.rail);
      this.addEventListener("click", this.move);
      this.rail.addEventListener("scroll", this.refresh, { passive: true });
      this.refresh();
    });
  }

  disconnectedCallback() {
    this.observer.disconnect();
    this.rail?.removeEventListener("scroll", this.refresh);
    this.removeEventListener("click", this.move);
    this.rail = null;
  }
}
customElements.define("stan-clip-scroll", ClipScroll);

export function recentPreview(jobs: { id: string; clips: Clip[] }[]): string {
  const recent = jobs
    .flatMap((j) => j.clips.filter((c) => c.status === "done" && c.cover).map((c) => ({ j, c })))
    .slice(0, 3);

  if (!recent.length) return "";

  return renderToStaticMarkup(
    <aside className="sc-recent" aria-label="Recent clips">
      <h3>Recent clips</h3>
      <div className="sc-frames">
        {recent.map(({ j, c }) => (
          <button
            key={j.id + c.id}
            type="button"
            data-act="openclip"
            data-j={j.id}
            data-c={c.id}
            aria-label={"Open " + (c.title || c.id)}
          >
            <img
              src={"/media/" + encodeURIComponent(j.id) + "/" + encodeURIComponent(c.cover!) + "?v=" + c.version}
              alt=""
            />
            <span>{c.title || c.hook}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

export function queueTable(posts: QueuePost[], tools: Tools): string {
  return renderToStaticMarkup(
    <ol className="stack queue-feed" aria-label="Posts">
      {posts.map((p) => (
        <li key={p.id}>
          <div>
            <strong>
              {p.url && /^https?:\/\//i.test(p.url) ? (
                <a className="lnk" href={p.url} target="_blank" rel="noopener">
                  {p.title}
                </a>
              ) : (
                p.title
              )}
            </strong>
            <small>
              {[p.account_name, p.creator_name, p.views != null ? p.views.toLocaleString() + " views" : null]
                .filter(Boolean)
                .join(" · ")}
            </small>
          </div>
          <span className={"pill " + (p.status === "posted" ? "ok" : p.status === "failed" ? "bad" : "warn")}>
            {deliveryLabel(p, tools)}
          </span>
          {p.error && <div className="err">{p.error}</div>}
          {p.status === "scheduled" && (
            <button type="button" className="btn sm" data-act="pcancel" data-id={p.id}>
              Cancel
            </button>
          )}
          {p.status === "failed" && (
            <button type="button" className="btn sm" data-act="pretry" data-id={p.id}>
              Retry
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}

let backdropRoot: Root | undefined;

export function setPageBackdrop(layer: HTMLElement, view: string): void {
  const page = view.startsWith("c:") ? "creator" : view;
  if (layer.dataset.page === page) return;

  const homeLayer = layer.firstElementChild as HTMLElement;
  if (page === "overview" && !backdropRoot) {
    backdropRoot = createRoot(homeLayer);
    backdropRoot.render(<WaveMesh className="home-wave-mesh" />);
  }
  layer.dataset.page = page;

  if (page !== "overview" && backdropRoot) {
    // Wait for the actual CSS fade, including a shortened or reversed transition.
    const retire = () => {
      if (layer.dataset.page !== "overview" && getComputedStyle(homeLayer).opacity === "0") {
        backdropRoot?.unmount();
        backdropRoot = undefined;
      }
    };
    Promise.allSettled(homeLayer.getAnimations().map((animation) => animation.finished)).then(retire);
  }
}

// Automatic Cursor Trail Initialization
if (typeof document !== "undefined") {
  const mountPixelTrail = () => {
    let host = document.getElementById("pixelTrailHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "pixelTrailHost";
      document.body.appendChild(host);
    }
    const root = createRoot(host);
    root.render(<PixelCursorTrail overlay={true} />);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountPixelTrail);
  } else {
    mountPixelTrail();
  }
}

class HomeInputBeam extends HTMLElement {
  private root?: Root;

  connectedCallback() {
    this.root = createRoot(this);
    this.root.render(
      <BorderBeam size="md" colorVariant="colorful" borderRadius={16} style={{ width: "100%", height: "100%" }}>
        <div className="home-beam-face" />
      </BorderBeam>
    );
  }

  disconnectedCallback() {
    this.root?.unmount();
    this.root = undefined;
  }
}
customElements.define("stan-home-input-beam", HomeInputBeam);
