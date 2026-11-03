# Code style

## Comments

Write self-explanatory code instead of comments. Names of variables, functions, and types should make intent clear without explanation.

Do not add comments in most cases. Only add a comment when it genuinely helps: clarifying an ambiguous type, documenting a non-obvious reason for doing something, or explaining a subtle edge case that the code alone cannot convey.

Never add comments that just restate what the code does.

# Skills

Every file under `.claude/skills/` is written in English: the frontmatter, the body, the references,
the comments and the messages printed by the scripts. The repository is international, so a new
skill is born in English even when it is designed in a French conversation.

- The conversation itself follows the user: a skill says "reply in the user's language", never
  "reply in French".
- French stays only where it is a real value: quoted trigger phrases in the `description` (next to
  their English equivalent), Notion statuses and property names, labels of the French `/admin`
  back-office as they appear on screen.

# Responsive

Every design and every UI implementation is responsive from the first version, never as a follow-up. Before calling a screen, dialog, panel or landing section done, check it at mobile (~375px), tablet (~768px) and desktop widths, and on a short viewport (~700px tall):

- nothing overflows horizontally, nothing is cut off, long text wraps or truncates on purpose
- multi-column layouts (dialogs with an illustration column, grids, side panels) stack or drop the secondary column on small screens
- fixed heights and fixed widths give way to `max-h` / `max-w` with scroll inside the content, the header and footer stay reachable
- footers and button rows wrap or stack instead of squeezing
- touch targets stay usable, hover-only affordances have a visible fallback

When a design is proposed (mockup, preview, screenshot), it shows the small-screen version too.

# Verify in the app before calling it done

Rerun has paying customers: a change that shows anywhere (a screen, a dialog, a button, a flow, an
API route the UI calls, the mobile app) is not done until it has been seen working in the running
app. Tests and the typecheck are not enough. Follow the `verify-in-app` skill without being asked:

- run it on the local stack only (`pnpm db:start`, `pnpm env:local`), never on production
- `pnpm verify:ui` signs in, captures every width in both themes and reports console errors,
  failed requests and load timings; a scenario in `.context/verify/` clicks the path that changed
- look at every capture, fix what the change broke, run it again
- the final message shows the captures, what was clicked, the errors found, and says plainly what
  could not be tested

# Supabase

## Reads always go through the typed helpers

Every Supabase **read** goes through the typed helpers (`selectSingle`, `selectMaybeSingle`, `selectFirst`, `selectMany`, `selectAll`, `selectCount`, `canRead`, and the `*WithJoins` variants). Never write a raw `.from(table).select(...)` for a read.

- `apps/ui` imports them from `@/supabase/supabase-helpers`

This applies everywhere: server components, server actions, route handlers, and client components. No exception for an existence check (`select('id')` as a guard) or for `select('*')` (extract a `XXX_COLUMNS = [...] as const` list instead).

Filters are objects: `{ id }`, `{ status: 'published' }`, `{ id: { neq: current } }`, `{ slug: ids }` (array = IN), `{ name: { ilike } }`. A join config needs `as const` on the whole object, not just `columns`.

## Writes always carry their payload type

**Writes** (`insert` / `update` / `delete` / `upsert`) and storage calls stay raw `.from(...)`, including their `.select()` returning clause. Every `insert` / `update` / `upsert` states its payload type explicitly:

```ts
supabase.from('agents').update<Database['public']['Tables']['agents']['Update']>({ name })
supabase.from('agents').insert<Database['public']['Tables']['agents']['Insert']>({ workspace_id, name })
supabase.from('experts').upsert<Database['public']['Tables']['experts']['Insert']>(row, { onConflict: 'slug' })
```

Always this verbose form, never `TablesInsert<'x'>`. `upsert` takes `Insert`. `delete` has no payload, so no generic. A file-local alias (`type PoolUpdate = ...`) is fine when the same table is written 3+ times in one file.

- `apps/ui` imports `Database` from `@/app/api/database.types`

Every client is built with `<Database>`: `createClient<Database>`, `createServerClient<Database>`, `createBrowserClient<Database>`. An untyped client silently degrades every payload and every table name to `any`. Any function taking a client is typed `SupabaseClient<Database>`, never bare `SupabaseClient`.

A spread payload (`.insert({ ...row })`) escapes excess-property checking, so pin the type where the object literal is built: annotate the builder's return type as the table's `Insert` / `Update`.

Before finishing any feature touching Supabase, grep your own diff for `.from('` and check nothing reads raw and every write carries its generic.

# Engine data-dir migrations

An engine data-dir can be archived and restored weeks later onto a newer engine. Anything that changes what the engine keeps on disk (a file, a folder, a SQLite schema) is a new numbered step at the end of its ladder: `DATA_DIR_MIGRATIONS` in `apps/engine/src/datadir/migrations.ts`, `SYSTEM_DB_MIGRATIONS` or `SHARED_DB_MIGRATIONS`.

- A shipped step is never edited nor removed, even once every live box has run it.
- A step is re-runnable, and leaves the old engine still running beside it working: add first, remove in a later step.
- A step ships with a test that starts from the previous version.

Details in `apps/engine/README.md`.

# The open source build

This repository is the open source build of Rerun. A few folders are stubs of what Rerun Cloud runs
in their place: `apps/ui/cloud/` (billing, paid apps, emails, the machine pool), `apps/engine/src/cloud/`
and two files of `packages/contracts` (`paid-data.ts`, `rewind.ts`). They keep the interface Rerun
Cloud implements, with the behaviour of a self-hosted install. Code elsewhere imports from them like
from any module; a pull request that changes what they export is unlikely to be merged.
