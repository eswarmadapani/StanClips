# Stan Clips interface

The launcher serves the compiled pages and local bundle from web/. Everyday use requires Python and the existing media dependencies. Rebuild the frontend after changing its source.

## Development

From the project root, run npm ci --prefix frontend and npm --prefix frontend run build. For continuous compilation run npm --prefix frontend run dev and use the ordinary Python server. The production build also runs TypeScript checking.

Each src/pages directory contains a React page shell and its document template. The build pre-renders the shell into the existing FastAPI page file. Document templates retain each workflow’s existing event handlers and network calls. src/library.tsx supplies reusable clip cards, destination labels, recent previews and horizontal browsing controls. src/studio.css contains the shared glass theme, responsive behavior, sparse lime accent and reduced-motion rules. Keep the emitted web pages and their referenced content-hashed JS bundle together when packaging.

## Workflow map

| Surface | Contracts to preserve | Review |
|---|---|---|
| Public and account | Landing metadata, sign-in, recovery, legal substitutions and callbacks | Accounts-on isolated server |
| Home and library | Sync polling, paste and upload, options, selection, download and clip dialog | Empty and seeded libraries, scroll, refresh and back |
| Layout studio | Source preview, drag and numeric crop, templates, render and save | Draft, stored layout and offline sample |
| Creator and live | Existing creator setup and recording controls, activity and cancellation | Simulated backend tests |
| Publishing | Account-specific queue actions, pause, retry reason and permalink | Simulated destinations; compare queue and clip states |
| Settings, admin and usage | Permissions, save feedback, masked credentials and storage | Isolated account modes and project test suite |

The charcoal and white surfaces are neutral. Use #ccff00 only for small identity details, a primary action or an active control. User videos and thumbnails keep their original colors.
