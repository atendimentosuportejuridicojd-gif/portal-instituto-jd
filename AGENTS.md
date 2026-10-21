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
- Simulados one-time payments use isolated checkout modules and the managed payments webhook, separate from the Stripe portal-subscription handler; this keeps paid service entitlements separate from portal subscriptions. Hotmart integration was removed; Stripe is the only payment provider.
- The Simulados Stripe price is resolved by its stable catalog lookup key, not an amount duplicated in code; change that catalog price to keep a single source of truth.
- Test payment webhooks must not write simulado_acessos because this shared entitlement table has no environment discriminator.
- Recover stale dynamic route assets with one guarded browser reload per minute and a full-page manual retry; router invalidation alone reuses the failed module reference.
- Prebundle lazy cronograma React dependencies at Vite startup to avoid replacing the optimized React graph during navigation in an already-open tab.
- Multi-career portal: content is never duplicated per career; `disciplinas`/`trilhas`/`concursos.carreiras` arrays link shared content to careers and student lists filter by `profiles.carreira` (locked after first choice by trigger, admins may switch).
- Portal plans sold via Stripe as one-time payments (monthly = 1 month, annual = 1 year, so Pix works; no auto-renewal) write to `assinaturas` (produto='stripe', Stripe ref in hotmart_transaction_id) from live webhooks only; the plan is derived server-side from `profiles.carreira`, so a student can't buy another career's price.
