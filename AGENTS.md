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
- Plan state is kept in a small localStorage-backed store (`src/lib/store.ts`), loaded after hydration; no backend so the demo cannot break.
