# Stan Clips design system
Design review draft · 24 November 2026

## Reference and provenance

Mobbin’s public site organizes a visual library into apps, sites, screens, flows, animations and UI elements. Individual examples can represent other companies’ products. Its platform terms describe ownership and licensing of the service and third-party materials. I found no official open-source license for the production Mobbin interface. Use the browsing idea as the reference. The dimensions, tokens, controls and wording below are Stan Clips design decisions. Research covered public pages, not the signed-in catalog. [Mobbin](https://mobbin.com/) · [Platform terms, sections 1 and 10](https://mobbin.com/terms)

## Visual direction

Open the companion preview.html to review the direction. Start on white with dark type, fit several clips in a single scan, and let the video supply the color. Group by source video so multiple near-identical thumbnails retain context. Reserve orange for the Stan Clips identity and the next primary action. On a card, give the hook one line if possible and give the distribution history a separate area below it. In the editor the stage turns charcoal so the real caption contrast is visible.

## Foundations

tokens.css is the source of truth for CSS custom properties. Bind the future Tailwind theme to these roles. Inter is the preferred family when bundled locally; the system stack works offline. Use display for page titles, heading for sections, title for clips, body for instructions and meta for dates and durations. Use sentence case and tabular digits for timecodes. Uppercase belongs to user-authored hook text. Space related items by 4–8 px, labels from their controls by 8 px, cards by 16–24 px and source groups by 32–48 px. Use the line token for dividers and control-line where a boundary identifies an input. No shadows. Hover changes color only. Corner rounding distinguishes controls, previews and short status labels.

## Layout and navigation

| Width | Navigation | Library | Editor |
|---|---|---|---|
| Under 640 px | Menu button opens a labeled drawer | One column below 400 px; two only when each preview can retain at least 184 px | Stage first, then tabs for layout and captions; sticky save action above safe area |
| 640–1023 px | Compact rail with accessible names | Fluid grid, minimum card width 184 px | Stage and collapsible inspector |
| 1024 px and up | 216 px rail for Home, All videos, Creators and Settings | Left-aligned content, 32 px gutters, maximum reading area 1440 px | Flexible stage, 320 px inspector |

Preserve deep links, browser Back, selected creator and scroll position when closing a clip. Keep the active location visibly marked. A drawer or modal traps focus, closes with Escape and restores the trigger. Touch targets are at least 44 × 44 px. On zoom, toolbars wrap before labels truncate.

## Components and behavior

| Component | Anatomy and interaction |
|---|---|
| Primary action | One prominent action per local task: Add video, Save layout, or Schedule post. Pair text and icon where the icon alone is ambiguous. Disabled actions explain the dependency. |
| Source input | Visible label, URL field, paste and local-file alternatives. Validate on submit; preserve input after an error. Show upload progress in bytes when known. |
| Clip card | 9:16 cover, duration on an opaque dark plate, title, optional editorial score, then a row per destination. Clicking the preview opens the clip. Selection, posting and overflow actions are separate buttons. Never nest buttons. |
| Library toolbar | Group by source; search and filters can be introduced when implemented. Distinguish an empty library from a filter with zero matches. Preserve filters when inspecting a clip. |
| Selection | Visible checkbox on keyboard focus and touch. Show count and existing bulk actions. Keep destructive actions in a separate confirmation step. |
| Player and editor | Play/pause, seek, timecode, caption visibility and crop handles. Use contain in the editor to expose the complete rendered frame. Provide keyboard/numeric alternatives to dragging. Maintain draft until Save or explicit discard. |
| Posting panel | List account, platform, date, local time and timezone. Confirm the destinations in the action summary. Show a busy state during submit to prevent a double click. |
| Status row | Platform, account and plain-text state. Color supports the label. Scope Retry or Cancel to one destination. Posted links open the returned permalink. |
| Settings | Group profile, AI, connected apps and storage. Inputs have labels, help and inline errors. Mask secrets and retain existing saved values when left blank. |
| Notifications | Use polite live announcements for transitions, not each poll. Errors stay available inline with a local Copy error action. Restore focus after confirmation. |

## State vocabulary

Render progress and delivery progress are separate. Render states are Queued, Rendering, Ready and Render failed. Show percentage only when measured. Keep a failed clip selectable for repair. During loading reserve preview dimensions to prevent movement.

| Queue evidence | Display | Available action |
|---|---|---|
| Future due time | Scheduled · Tue 06:51 IST | Cancel |
| Due time has passed, worker has not started | Waiting to upload | Cancel |
| Global pause and scheduled entry | Posting paused | Open queue |
| Worker processing destination | Uploading | View status |
| Transient failure with another attempt scheduled | Retry at 07:01 IST; latest reason on expansion | Cancel |
| Remote publication confirmed | Posted | Open post when link exists |
| Terminal failure | Failed plus actionable reason | Retry when supported |

Example at 06:53: Instagram can say Uploading while YouTube says Waiting to upload for the same clip scheduled at 06:51. A successful render alone never yields Posted. Show pause before overdue timing; preserve the retry reason while paused.

## Screen recipes

- **Home and intake:** Paste a source or choose a file. Show the detected source and a preview before clip creation. With an empty library the customizable dashboard starts with the bundled demo, then switches to a selected source frame.
- **All videos:** Source thumbnail, title and clip count precede each group. A first-time empty library offers Add video. A filtered empty result offers Clear filters. Failed covers reserve the same space as ready covers and explain how to recover.
- **Clip details:** Preview, title and description, captions, then per-platform delivery. Keep the clip title visible while choosing destinations. Separate changes affecting a rendered file from changes affecting post copy.
- **Layout studio:** Preview the actual portrait frame; place layout, crop and captions near it. Switch between sample and source without losing existing drafts. Clearly label Save layout and the existing render action.
- **Creator and live:** Expose recording independently of clip generation. Keep Start/Stop recording beside creator identity; put setup and activity in their own tabs.
- **Home queue:** Group by date, show local timezone and expand one destination at a time. Pausing has a persistent explanation and a visible Resume posting action.
- **Settings, usage and account pages:** Use narrower reading columns, identical form conventions and explicit saved/failed feedback. Public landing pages can use larger media; sign-in and recovery keep one clear primary action.

## Implementation and review gate

Future React components can share AppShell, SourceGroup, ClipCard, PreviewStage, DestinationStatus and PostingPanel. Map existing API states at the component boundary; preserve backend actions and per-account timestamps. Use shadcn primitives for dialogs, menus and tabs with these tokens. Keep the first migration slice to the library and clip card.

Review at 320, 390, 768 and 1440 px, 200% zoom, keyboard only and reduced motion. Check readable text contrast (4.5:1 for normal text), visible focus, readable overlay plates, long account names, missing covers and independent platform outcomes. Tab through selection and posting in document order. The reference sheet uses local demo media and fictional queue states. Approve the library density, portrait size and status wording before starting the application migration.
