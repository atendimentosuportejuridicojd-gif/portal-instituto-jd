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

- Public advertising pages live as leaf routes under `src/routes/` and inherit `__root.tsx`, so shared Google Ads and cookie consent initialization always applies.
- New admin-created study materials default to Markdown text content, because the portal no longer uses PDF uploads for authoring.
