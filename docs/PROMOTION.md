# Agna — Promotion rule

One page, the whole rule.

1. **The app writes only three agency tables.** `public.agna_items`, `public.agna_crons`,
   and `public.agna_cron_runs` on `wieldveraqrbygapidlo` are the only request-path writes.
   `store.ts` rejects any other table name. The app never opens a CODICE client.

2. **Spine and releases move on migrations, not requests.** `public.agna_spine` and
   `public.agna_releases` change only in SQL migration files, applied by hand or by CI — never
   by a running request handler.

3. **A major bump updates agency tables first, then opens a review.** Bump `agna_spine.release`
   and insert the new version into `agna_releases` with `promotion_status = 'review'`. Stop
   there. Do not generate a CODICE statement yet.

4. **CODICE changes only after that review is explicitly approved.** Once approved, write the
   corresponding `supabase/codice/NNN_*.sql` migration (new spine rows, updated vocabulary,
   updated `spine.v_spine` if needed) and apply it to `rktwcqzmwkitjwnvtusc` only.

5. **Minor and patch bumps never touch CODICE.** They stay on the agency side; `promotion_status`
   for those versions is `none` or `promoted` as appropriate, never `review`.

6. **v1.0.0 is not frozen yet.** Neither the agency migration
   (`supabase/migrations/20260922020000_agna_store.sql`) nor the CODICE registration
   (`supabase/codice/001_register_agna.sql`) has been applied to a live project. W8 (create
   `spine.agna`, `spine.source_project` row `agna`, the new/updated `spine.glossary`
   vocabulary, copy the agency seed into `spine.agna` explicitly, extend `spine.v_spine`, then
   insert agency `agna_releases` v1.0.0 as `frozen`) is still pending and requires a human to
   confirm CODICE access before it runs.

7. **`public.agents` and `public.models` on CODICE are untouched and unrelated.** They are a
   demo picker (six sample agents, a name list) that has nothing to do with the Agna spine.

## Why this pass renamed in place instead of bumping a major version

Rule 6 is the reason: renaming `aoumai_*` → `agna_*` here was a straight rename, not a
promotion event, because nothing under the old name was ever live. If a future rename ever
needs to happen against a project where the old-named tables or CODICE rows are already
applied and serving traffic, do **not** rename in place — instead follow rules 3–4: bump
`agna_spine.release` as a major version, add the new tables/spine rows alongside the old ones
(or via a `create table ... as select` + view alias so both names resolve), open a review, and
only drop the old names after that review is approved and traffic has moved. Never silently
drop or rename a table that a live CODICE row (`entity_ref`) still points at.
