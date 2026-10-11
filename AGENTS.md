<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Ziphyrus X decisions
- Login UI talks only to `authService` (src/lib/auth/service.ts); swap the adapter via `VITE_AUTH_MODE=api` — keeps the backend replaceable and the browser never picks its role.
- Landing-page content and illustrative data live in src/data/site.ts; admin mock data in src/features/super-admin/mock-data.ts — so placeholders are easy to find and replace.
- Secondary Super Admin modules render from one route (/admin/m/$module) keyed by src/features/super-admin/nav.ts — one place to add modules.
- Theme is a `dark`/`light` class on <html>, set pre-paint by THEME_SCRIPT — avoids a flash of the wrong theme.
- Role workspaces are a layout route (e.g. /editor) rendering WorkspaceShell with a nav config in src/features/<role>/nav.ts; data goes through src/features/<role>/mock-service.ts until the API exists — one swap point per role.
