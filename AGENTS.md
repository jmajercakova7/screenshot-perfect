<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Public tutor data is read through `createServerFn` in `src/lib/tutors.functions.ts` with a publishable, session-less client — keeps SSR pages shareable without touching browser storage.
- Signed-in pages live under `src/routes/_authenticated/` (client-only gate, `ssr: false`) — the session lives in localStorage, so a server-side gate would redirect-loop.
- One auth listener only: `SessionProvider` in `src/hooks/use-session.tsx`, mounted in `__root.tsx` — avoids duplicate subscriptions and cache thrash.
- Subject catalogue lives in code (`src/lib/subjects.ts`); the database stores subject slugs on tutors — keeps URLs and filters stable.
- Tutor ranking/filter rules live in `src/lib/matching.ts` with tests in `matching.test.ts` — change both together.
- Learner vs tutor is `profiles.account_type`, a persona only; never use it to grant permissions (add a separate roles table for that).
