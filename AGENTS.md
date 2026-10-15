# AGENTS.md

Guidance for AI agents working in this repository.

## What this is

A **Vue 3 + Vite + Pinia + TypeScript SPA** that browses files on a remote
server. Everything is fetched remotely; there is no backend of ours. The UI is
served through a dev-server proxy so the browser only ever talks to one origin.

The API is **not** the [filebrowser](https://filebrowser.org) project. It is a
custom **Go/gin** application (`FileBrowser Quantum`) at `https://files.nuc.ge`.
Do not assume filebrowser's endpoints, auth, or response shapes — they differ.

Single-tenant today: one account, one source. Multi-user is not supported.

---

## Commands

```sh
npm run dev                # vite dev server on :5173
npm run build              # type-check + build + secret scan
npm run build-only         # vite build, skips type-check and secret scan
npm run type-check         # vue-tsc
npm run lint               # oxlint then eslint
npm run format             # oxfmt
npm run test:unit          # vitest (75 tests)
npm run verify:no-secrets  # fail if any .env value reached dist/
```

`npm run build` is the gate that must pass before any commit. It chains three
checks deliberately:

- `type-check` — catches prop/type drift
- `build-only` — catches import and bundling errors
- `verify-no-secrets` — catches a credential reaching the shipped bundle

Use `build-only` alone only when you are iterating on CSS or bundling and know
type-check already passes.

---

## Architecture

```
src/
  api/          one module per API domain; the ONLY place fetch is called
    client.ts     request(), ApiError, onSessionExpired — the single choke point
    auth.ts       login / renew / logout
    users.ts      fetchProfile -> /api/users
    resources.ts  listDirectory -> /api/resources
    media.ts      streamUrl / viewUrl / previewUrl
  stores/       Pinia; owns state and orchestrates api/*
    auth.ts       token, login, logout
    resources.ts  directory tree, expanded set, selection
    menu.ts       sidebar items + collapsed flag
  components/
    files/        presentational, no store access, no fetching
      FileTree.vue, FileTreeItem.vue   recursive tree, props in / events out
      FileViewerPane.vue               wraps @open-file-viewer
    ui/           shadcn-vue registry components — do not hand-edit
  views/         route components; own the stores
  layouts/       AppLayout.vue — sidebar + outlet
  config/env.ts  dev-only credentials, DEV-gated
  lib/           pure helpers (cn, worker-url)
```

### Layer rules

1. **`api/*` never imports from `stores/*`.** `client.ts` takes a token as a
   parameter and signals expiry through `onSessionExpired()`. Breaking this
   creates a cycle: `client → stores/auth → api/auth → client`.
2. **`components/files/*` read Pinia stores; they never call `fetch`.** They are
   not prop-only — a store read inside a component is the intended shape, so do
   not "fix" one back into props. Fetching stays in `api/*`; that separation is
   what keeps the components testable.
3. **Views orchestrate.** A view composes stores and decides what happens on an
   event. Components render and may read a store, but never sequence calls.
4. **`api/*` are plain async functions, not classes or repositories.** One
   implementation each; a repository interface would be ceremony.

---

## API contract

**Verified against the live API and `https://files.nuc.ge/swagger/doc.json` on
2026-10-15.** Anything not marked ✅ below is unverified — probe before relying
on it.

### Authentication

```
POST /api/auth/login?username=<user>
X-Password: <url-encoded password>
<empty body>
```

- ✅ The username is a **query parameter**, the password an **`X-Password`
  header**, and the body is **empty**. A JSON body does not work.
- ✅ The password **must be URL-encoded** — this is deliberate, so `^ % £ €`
  survive. Use `encodeURIComponent`.
- ✅ A 200 returns a **bare JWT string**, not JSON. Hence `parse: 'text'`.
- ✅ The JWT payload is `{iss, iat, exp}` with `exp - iat = 7200` (**2 hours**).
- ✅ `POST /api/auth/renew` returns the **byte-identical token** — the expiry
  does not move. It is a no-op.
- ✅ Renew **rejects already-expired tokens** (`401 signature is invalid`). A
  dead session cannot be rescued; it must re-login.
- ⚠️ `POST /api/auth/logout` exists but its revocation semantics are
  unverified. `auth.logout()` is intentionally client-side only.

### Identity

```
GET /api/users
```

- ✅ **Returns an ARRAY of user records**, not a bare object. `profiles[0]`.
- ✅ `scopes[].name` is the **`source`** every resources endpoint requires.
  Never hardcode it — it differs per account.
- ✅ `scopes[].scope` is the root path inside that source. `?path=/` resolves to
  it, so `/` is the tree root.
- ✅ Useful fields: `username`, `loginMethod`, `otpEnabled`, `scopes[]`,
  `permissions`.

### Files

```
GET /api/resources?path=&source=          → full FileInfo
GET /api/resources/items?path=&source=    → {files: string[], folders: string[]}
```

- ✅ **`files` and `folders` keys are OMITTED when empty**, not `[]`. Always
  read them as `info.files ?? []`. A naive renderer crashes on this.
- ✅ `FileInfo.path` is **canonical and always ends in `/`**. Use it; never
  join paths yourself. Child entries carry only `name`, so child paths are
  `info.path + child.name`.
- ✅ File and folder entries carry `viewToken`. You do **not** need to call
  `/api/resources/view-token` to preview.
- ✅ `source` is **required**; omitting it gives `403 source name not found`.

### Inline content

```
GET /api/media/stream?source=&file=&viewToken=    ← media only
GET /api/resources/view?source=&file=&viewToken=  ← everything else
```

- ✅ Both require the bearer token **and** a `viewToken`. The `viewToken` alone
  gives `401 no token present in request`.
- ✅ Both answer `206` with `accept-ranges: bytes`, so seeking works.
- ✅ **They are not interchangeable.** `/api/media/stream` returns **403** for a
  PDF; `/api/resources/view` serves documents, images and text. Use
  `previewUrl()` in `api/media.ts`, which picks by MIME type.
- ✅ `file` is a full path; `source`, `file` and `viewToken` are all query
  parameters.
- ⚠️ `viewToken` lifetime is **unknown**. If playback starts failing after a
  while, extend it via `POST /api/resources/view-token?source=&viewToken=`.

### Errors

```json
{"status": 401, "message": "invalid token: token is expired by 3h17m21s"}
```

- ✅ `message` is already user-presentable — surface it verbatim.
- ✅ **401 is not only expiry.** `user unauthorized` (bad password),
  `invalid token provided` (malformed) and `no token present in request` are
  also 401. See Traps #4 for how we disambiguate.
- ⚠️ A 404 leaks a server path (`lstat /mnt/…`). Not our bug, but do not echo
  it to users.

### Proxy and auth injection

The API sends **no CORS headers**, so the SPA calls same-origin `/api/*` and
`vite.config.ts` proxies to the real host. The proxy also **injects the
`Authorization` header**, because `<video src>` and workers cannot send one.

- ✅ `?auth=<token>` also works as a query parameter, but it puts a 2-hour JWT
  in URLs and server access logs. The proxy avoids this. Do not use it.
- ✅ The proxy mints its **own** media token at startup from `.env` credentials
  and re-mints every 50 minutes (TTL is 120). A static token silently kills all
  video after two hours.

---

## Traps

Each of these produced a **green build with broken behaviour**.

### 1. Tailwind must be registered in `vite.config.ts`

`@tailwindcss/vite` is a dependency but is **not** auto-registered. Without
`tailwindcss()` in `plugins`, no utility classes are generated and every shadcn
component renders unstyled. The tell is `Unknown at rule: @apply` in build
output.

### 2. `?url` imports are absolute in dev — mixed content

`server.origin` is `http://filebrowser.test:5173`, so Vite emits **absolute
http** URLs for `?url` imports. Behind an https proxy the browser blocks them.

`src/lib/worker-url.ts` strips the origin. **Its failure mode is silent**:
pdf.js falls back to a slow main-thread worker and still renders, so PDFs just
get sluggish with a console error. `worker-url.spec.ts` guards this.

### 3. Stale Vite dep cache looks like a code bug

`504 (Outdated Optimize Dep)` after changing dependencies or killing the dev
server. Fix: `rm -rf node_modules/.vite` and restart. Not a code problem.

`lerd` supervises the vite process and holds port 5173 — killing vite respawns
it. Kill the whole chain if you need a clean restart.

### 4. Never log out on a bare 401

Login failure is also 401 (`user unauthorized`). `client.ts` fires
`onSessionExpired` only when **401 AND the request carried a token**. Removing
the `&& token` logs users out whenever they mistype a password.

### 5. `/api/users` returns an array

`profile.username` on the array is `undefined`; it fails at runtime, not
compile time.

### 6. `files` / `folders` keys are omitted, not empty

See API contract above. `?? []` everywhere.

### 7. Never put a bearer token in a URL

`npm run build` runs `verify-no-secrets`, which greps `dist/` for every
`.env` value. It checks **both** the raw `.env` text and the unescaped form,
because dotenv strips backslashes — searching for the raw text alone gave a
false negative on the exact secret it exists to catch.

Keep the `import.meta.env.DEV` guard in `config/env.ts`. Removing it ships the
password in the built JS; build, lint and tests all still pass.

### 8. `className` is a prop, not a fallthrough attribute

`<OpenFileViewer class="...">` is silently dropped — the component renders a
fragment. Use `class-name="..."`.

### 9. shadcn ESLint override must stay last

`defineConfigWithVueTs` injects the recommended rules, so the
`vue/multi-word-component-names` override in `eslint.config.ts` is clobbered if
placed earlier. It must be the final entry.

### 10. `shadcn add` fails to resolve peers

`eslint@^10` conflicts with `@vue/eslint-config-typescript`'s `eslint@^9`
peer. The installed 14.9.0 accepts both. Install with `--legacy-peer-deps`, or
vendor registry JSON from `shadcn-vue.com/r/styles/new-york/<name>.json`.

---

## Configuration

`.env` (gitignored) holds dev-only credentials:

```
VITE_DEV_USERNAME=...
VITE_DEV_PASSWORD=...
```

- ⚠️ **`$` must be escaped in `.env`.** Vite runs variable expansion, so
  `Pa$$w0rd` becomes `Pa$`. Quoting (`"` or `'`) does **not** help. Write
  `Pa\$\$w0rd`.
- ⚠️ There is **no `MEDIA_TOKEN` variable.** The proxy mints its own token at
  startup from the credentials above.
- ⚠️ The dev auto-login and the proxy mint each perform a login. Together with
  manual logins that can trip the API's login rate limit (429).

No `VITE_API_BASE_URL`. The SPA always uses relative `/api/*`; the host appears
exactly once, in `vite.config.ts`.

### Browser storage

Keys are namespaced `filebrowser.*` and all persist through `useStorage` from
`@vueuse/core`:

```
filebrowser.token     JWT, cleared on logout
filebrowser.theme     'light' | 'dark' | 'auto'
filebrowser.collapsed boolean  desktop sidebar rail state
filebrowser.recent    Entry[]           newest first, capped at 50
filebrowser.starred   Record<path, Entry>
```

- ✅ `useStorage`'s `eventFilter` applies to the **write watcher only**. Pass
  `debounceFilter(200)` to collapse a burst of `setItem` calls while the ref
  stays instant for the UI. No wrapper of our own.
- ⚠️ A `string` value is stored **bare, not as JSON** — `useStorage` writes
  `dark`, not `"dark"`. The inline theme script in `index.html` reads that key
  before the bundle loads; `JSON.parse` on it throws and blanks the page.
- ⚠️ **Never persist a `viewToken`.** Its lifetime is unknown, so a stored one
  401s later. Recents and stars store paths; opening one re-reads its parent
  directory for a fresh node.
- `localStorage` is not a secret store. Nothing secret goes here.

---

## Todos

Known gaps, in rough priority order.

- [ ] **Token refresh.** Sessions die at 2 hours and `renew()` cannot help.
      Options: store credentials client-side, or probe whether named API tokens
      (`POST /api/auth/token`) live longer. Note the swagger warns some routes
      require a web session, not a named token — verify before adopting.
- [ ] **Upload / download.** `/api/resources` supports `POST`, and
      `/api/resources/download` exists. Nothing is wired.
- [ ] **Menu placeholders.** `Recent`, `Starred`, `Trash` and `Settings` render
      disabled — they have no route or endpoint yet.
- [ ] **Server-side logout.** `POST /api/auth/logout` is unverified.
- [ ] **File operations.** Rename, move, delete, bulk actions.
- [ ] **Search.** `/api/tools/search` and `/api/tools/duplicate-finder` exist.
- [ ] **Multi-user.** The proxy injects a *fixed* identity, so media is fetched
      as that user regardless of who is signed in. Fine for one account;
      wrong the moment a second user appears. The seam is `rewriteRequest()` in
      `vite.config.ts`.
- [ ] **Reverse proxy for production.** Required for CORS; not implemented.
      There is no deployment target or CI.
- [ ] **README** is still the untouched Vite scaffold.

Deliberately not planned: virtualised tree for very large directories,
thumbnail previews (`/api/resources/preview` exists), offline support.

---

## Testing

75 tests, no e2e. Conventions:

- Store tests mock `api/*` with `vi.mock` and set `useAuthStore().token`
  directly — stubbing `login()` does **not** set the token.
- One test per API quirk that would otherwise be rediscovered: absent keys,
  the 401-with-token rule, the array-shaped profile, worker URL rewriting.
- Component tests exist for `FileTree`/`FileViewerPane` only indirectly; the
  presentational components are thin enough that browser verification is used.

**Verify UI changes in a real browser.** A wrong `defineAsyncComponent` import
path type-checks and builds green, then fails silently at runtime. Check 390px
(touch, drawer closed on load, viewer full screen), 768px (the `md` seam) and
1440px (expanded and collapsed rail) — the layout branches in `AppLayout.vue`
and `FilesView.vue` have no unit tests covering them.

---

## Reference

- Design docs: `docs/superpowers/specs/`. **`docs` is gitignored** — the specs
  are private and must never be force-added or published.
- Live swagger (token-gated): `https://files.nuc.ge/swagger/doc.json`
- Obtain a token:
  ```sh
  curl -X POST 'https://files.nuc.ge/api/auth/login?username=<user>' \
    -H 'X-Password: <url-encoded password>' -d ''
  ```
  It returns the JWT as the raw response body.
- UI: Vue 3 `<script setup>`, Pinia setup-stores, Tailwind v4 + shadcn-vue
  (new-york, neutral base, Inter). Icons from `@lucide/vue`.