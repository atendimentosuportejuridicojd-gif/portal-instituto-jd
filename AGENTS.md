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
- Simulados one-time payments use isolated checkout modules and the managed payments webhook, never the Hotmart subscription flow; this keeps paid service entitlements separate from portal subscriptions.
- The Simulados Stripe price is resolved by its stable catalog lookup key, not an amount duplicated in code; change that catalog price to keep a single source of truth.
- Test payment webhooks must not write simulado_acessos because this shared entitlement table has no environment discriminator.
- Recover stale dynamic route assets with one guarded browser reload per minute and a full-page manual retry; router invalidation alone reuses the failed module reference.
- Prebundle lazy cronograma React dependencies at Vite startup to avoid replacing the optimized React graph during navigation in an already-open tab.
