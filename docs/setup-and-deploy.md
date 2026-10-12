# Setup, run and deploy

Everything runs on Cloudflare's free tier: **Pages** (React app), **Workers** (API), **D1** (SQLite) and **R2** (icon images). Login is **Auth0**.

You'll create these once and then reuse them:

| Thing | Name used below |
|---|---|
| Worker | `jupiter-wallet-api` |
| D1 database | `jupiter-wallet-db` |
| R2 bucket | `jupiter-wallet-icons` |
| Pages project | `jupiter-wallet` |
| Auth0 API identifier (audience) | `https://jupiter-wallet-api` |

## 1. Prerequisites

- Node.js 22 or newer and npm.
- A Cloudflare account (free). R2 asks for a payment card on file even though the free tier (10 GB) costs nothing.
- An Auth0 account (free).
- Log in to Cloudflare from your terminal: `npx wrangler login`.

Install dependencies:

```bash
npm --prefix backend ci
npm --prefix frontend ci
```

## 2. Auth0

1. **Create the API** (Applications → APIs → Create API).
   - Identifier (this is the *audience*): `https://jupiter-wallet-api`.
   - Signing algorithm: RS256.
2. **Create the application** (Applications → Create Application → *Single Page Web Application*). Note its **Domain** and **Client ID**.
3. In the application's **Settings**, set all three of these to your app URLs, comma separated: `http://localhost:5173, https://jupiter-wallet.pages.dev`
   - Allowed Callback URLs
   - Allowed Logout URLs
   - Allowed Web Origins
4. In the application's **Advanced → Grant Types**, make sure *Implicit* is off and *Refresh Token* is on. Under Settings → Refresh Token Rotation, turn rotation on.
5. Optionally, under Authentication → Social, enable Google or other connections.

6. **One user per email** (needed when both Google and username-password logins are enabled; Auth0 otherwise creates a separate user, with a separate `sub`, per connection).
   1. Applications → Create Application → *Machine to Machine*, authorized for the **Auth0 Management API** with scopes `read:users`, `update:users` and `create:users`.
   2. Actions → Library → Create Action → *Login / Post Login*, name it `link-accounts-by-email`. Add secrets `DOMAIN` (your tenant domain), `CLIENT_ID` and `CLIENT_SECRET` (of the M2M app). Paste:

      ```js
      // @ts-nocheck (the editor types `response.json()` as unknown and underlines it)
      exports.onExecutePostLogin = async (event, api) => {
        if (!event.user.email || !event.user.email_verified) return;
        const base = `https://${event.secrets.DOMAIN}`;
        const json = { "content-type": "application/json" };
        const { access_token } = await (await fetch(`${base}/oauth/token`, {
          method: "POST", headers: json,
          body: JSON.stringify({ grant_type: "client_credentials", client_id: event.secrets.CLIENT_ID, client_secret: event.secrets.CLIENT_SECRET, audience: `${base}/api/v2/` }),
        })).json();
        const headers = { ...json, authorization: `Bearer ${access_token}` };

        const found = await (await fetch(`${base}/api/v2/users-by-email?email=${encodeURIComponent(event.user.email)}`, { headers })).json();
        const others = found.filter((u) => u.email_verified && u.user_id !== event.user.user_id);

        // The oldest account is the primary, so its wallet data (keyed by `sub`) stays reachable.
        const all = [...others, { user_id: event.user.user_id, created_at: event.user.created_at, identities: event.user.identities }];
        const [primary, ...secondaries] = all.sort((a, b) => a.created_at.localeCompare(b.created_at));
        const link = ({ provider, user_id }) => fetch(`${base}/api/v2/users/${encodeURIComponent(primary.user_id)}/identities`, { method: "POST", headers, body: JSON.stringify({ provider, user_id }) });
        for (const { identities: [identity] } of secondaries) await link(identity);

        // Give social-only users a database identity (random password) so "Forgot password" works without signing up.
        if (!all.some((u) => u.identities.some((i) => i.provider === "auth0"))) {
          const created = await (await fetch(`${base}/api/v2/users`, {
            method: "POST", headers,
            body: JSON.stringify({ connection: "Username-Password-Authentication", email: event.user.email, email_verified: true, password: `${require("crypto").randomUUID()}Aa1!` }),
          })).json();
          await link(created.identities[0]);
        }
        if (primary.user_id !== event.user.user_id) api.authentication.setPrimaryUser(primary.user_id);
      };
      ```

   3. Deploy the Action, then Actions → Flows → Login, drag it into the flow and Apply.
   4. On every login of a verified user, the Action links same-email accounts and, if the user has no password identity yet (e.g. Google only), creates one with a random password. "Forgot password" then works for that email. Only verified emails are linked. Turn on email verification for the username-password connection, otherwise those users stay separate.

You now have three values: `AUTH0_DOMAIN` (like `your-tenant.eu.auth0.com`), `AUTH0_AUDIENCE` and the SPA's `CLIENT_ID`.

## 3. D1 database

```bash
cd backend
npx wrangler d1 create jupiter-wallet-db
```

Copy the printed `database_id` into `backend/wrangler.jsonc` (replace `replace-me`). Then create the tables and seed data (system categories and icons):

```bash
npm run db:migrate:local    # for local dev
npm run db:migrate:remote   # for the deployed worker
```

New migrations go in `backend/migrations/` as `000N_name.sql` and are applied by the same commands.

## 4. R2 bucket

```bash
npx wrangler r2 bucket create jupiter-wallet-icons
```

The worker uploads icon images into it and serves them itself at `/api/icons/files/:key`. The bucket stays private, and there's nothing else to configure.

## 5. Run the backend locally

```bash
cd backend
cp .dev.vars.example .dev.vars    # then edit the Auth0 values
npm run dev                       # http://localhost:8787
npm test                          # all tests, no Auth0 or Cloudflare needed
```

Tests run inside the real Workers runtime (miniflare) against an in-memory D1 and R2, and sign their own test tokens.

## 6. Run the frontend locally

```bash
cd frontend
cp env.example .env.local         # then edit the values
npm run dev                       # http://localhost:5173
```

`.env.local`:

```
VITE_API_URL=http://localhost:8787
VITE_AUTH0_DOMAIN=your-tenant.eu.auth0.com
VITE_AUTH0_CLIENT_ID=<spa client id>
VITE_AUTH0_AUDIENCE=https://jupiter-wallet-api
```

Sign in through the Auth0 page and you land on the wallets page.

## 7. Deploy the Worker (API)

1. Edit the `vars` in `backend/wrangler.jsonc`:
   - `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` as above.
   - `ALLOWED_ORIGINS`: the URL(s) of the deployed frontend, comma separated, for CORS (for example `https://jupiter-wallet.pages.dev`; add `http://localhost:5173` if you also want local frontends to call it).
2. Deploy:

```bash
cd backend
npm run db:migrate:remote
npm run deploy
```

Wrangler prints the worker URL, like `https://jupiter-wallet-api.<your-subdomain>.workers.dev`. Check it with `curl <url>/api/wallets`, which should answer `401`.

## 8. Deploy the frontend (Pages)

Vite bakes the `VITE_*` values into the bundle at build time, so set them when you build:


```bash
npm run deploy
```

or
```bash
cd frontend
npx vite build --mode dev
npx wrangler pages deploy dist --project-name jupiter-wallet
```

The site is at `https://jupiter-wallet.pages.dev`. Make sure that URL is in the Auth0 application URLs (step 2) and in the worker's `ALLOWED_ORIGINS` (step 7). `public/_redirects` makes deep links like `/categories` fall back to `index.html`.

## 9. Deploy from GitHub Actions

`.github/workflows/publish.yml` tests and deploys both parts on every push to `main` (or on demand). It runs in the `Production` environment, so define these there:

| Kind | Name | Value |
|---|---|---|
| Secret | `CF_API_TOKEN` | Cloudflare API token with *Workers Scripts: Edit*, *D1: Edit*, *Cloudflare Pages: Edit* (and *Workers R2 Storage: Edit* if you create buckets in CI) |
| Secret | `CF_ACCOUNT_ID` | your Cloudflare account id |
| Variable | `WALLET_API_URL` | the worker URL from step 7 |
| Variable | `WALLET_AUTH0_DOMAIN` | Auth0 domain |
| Variable | `WALLET_AUTH0_CLIENT_ID` | SPA client id |
| Variable | `WALLET_AUTH0_AUDIENCE` | `https://jupiter-wallet-api` |
| Variable | `WALLET_PAGES_PROJECT` | `jupiter-wallet` |

Do steps 3, 4 and the first deploy of 7 and 8 by hand once, so the database id, bucket and Pages project exist.

## Troubleshooting

- **Browser says CORS error**: the frontend's exact origin (scheme + host, no trailing slash) is missing from `ALLOWED_ORIGINS`. Redeploy the worker after changing it.
- **API returns 401 with a valid login**: `AUTH0_AUDIENCE` on the worker differs from `VITE_AUTH0_AUDIENCE`, or `AUTH0_DOMAIN` has a typo or an `https://` prefix (it must be the bare host).
- **Auth0 "Callback URL mismatch"**: add the exact URL you opened to Allowed Callback URLs.
- **`no such table`**: migrations weren't applied to that database. Run `npm run db:migrate:local` or `db:migrate:remote`.
- **Icon upload fails with 500**: the R2 bucket doesn't exist or its name doesn't match `wrangler.jsonc`.
- **Logged out on every refresh**: the Auth0 application must allow refresh tokens, and the Auth0 provider uses `cacheLocation="localstorage"`.
