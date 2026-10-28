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

- All care-cost assumptions and plan formulas live in `src/lib/plan.ts` (covered by `plan.test.ts`); pages only read `computePlan` so numbers stay consistent and swappable for real datasets later.
- Financial demo state remains in the existing localStorage store, loaded after hydration; Cloud is used only for email authentication and owner-scoped profiles, so login never changes plan values.

- Presentation translations use a render-bound language hook and a separate dictionary; never translate persisted scenario IDs, family modes or numeric assumptions.
- Shared navigation and reading preferences live in app shell components; mobile uses a drawer and bottom shortcuts without changing page workflows.
- AI intake only fills the form; its logic lives in src/lib/intake*.ts — do not edit.
- Health UI lives in `src/components/health` and imports the existing health helpers unchanged; PDF rendering is dynamically imported only after user action to keep browser-only code outside SSR execution.
