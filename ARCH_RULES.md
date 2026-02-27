# Clean Architecture Rules

This project uses Clean Architecture folders at the repo root:

- `/core`
- `/adapters`
- `/infrastructure`
- `/app`
- `/tests`

## Non-negotiable boundaries

1. `/core` may import **only** other `/core` modules.
2. `/core` must contain **no** framework/runtime IO code:
   - no `express`
   - no `fs`
   - no `path`
   - no `js-yaml`
   - no DOM / `window` / `document`
   - no `fetch`
3. Ports are defined **only** in `/core/ports`.
4. `/infrastructure` implements ports (filesystem, YAML, clock, etc.).
5. `/adapters` translate transport IO (HTTP req/res) to use case DTOs and back.
6. `/app` is the composition root only (wiring + runtime boot).
7. Consumer static site pages under `/site` may remain as-is during migration.

## Compatibility requirement

- Existing admin endpoints and JSON shapes must remain compatible with `/site/admin-custom`.
