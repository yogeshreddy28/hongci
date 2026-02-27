# CMS Admin (Decap CMS)

## Open Admin
- Open `/admin` in your deployed site, or open `/site/admin/index.html` locally.
- Admin UI is Decap CMS (Git-based content editing).

## Login
- Default config uses `git-gateway` (Netlify Identity + Git Gateway).
- Alternative GitHub backend config is included as commented lines in `/site/admin/config.yml`.

## What Admins Can Edit
- `Settings`: donation prompts, UPI details, dynamic QR links
- `Pages`: structured page blocks for core pages
- `Events`: upcoming/past/cancelled community events
- `Books`: Book Seva inventory
- `Transparency Reports`: monthly summaries + notes

## Content Storage
- All editable content lives in `/site/content/`
- Media uploads go to `/site/assets/uploads/`

## How Pages Render
- Existing page HTML/CSS remains the UI/UX layer.
- A small client-side renderer loads page content from YAML and renders blocks into `#cms-blocks`.
- If content loading fails (for example some `file://` browser restrictions), the current hardcoded page content remains visible.

## Editing Pages / Blocks
- Edit a page in the `Pages` collection.
- Add / reorder blocks in `blocks`.
- Supported block types:
  - hero
  - richtext
  - quote
  - card_grid
  - metrics
  - event_list
  - donation_prompt
  - divider

## Add Events / Books / Reports
- `Events`: create a file in `content/events/` via CMS form (or manually)
- `Books`: create/update inventory entries in `content/books/`
- `Reports`: add one file per month in `content/reports/` (e.g. `2026-03.yml`)

## Media Upload Rules
- Uploads are stored in `assets/uploads`
- Prefer web-friendly images (`.jpg`, `.png`, `.webp`)
- Keep filenames clear and lowercase where possible

## Dynamic QR Links
- Managed in `content/settings.yml` under `dynamic_qr_links`
- Can be used by forms / QR sections without changing page layout code

## Notes for Local Testing
- Decap Admin UI can open locally, but full auth flow depends on your Git backend setup.
- YAML content rendering may be blocked by some browsers under `file://` due fetch restrictions.
- When deployed (or served locally with a static server), content loading works reliably.
