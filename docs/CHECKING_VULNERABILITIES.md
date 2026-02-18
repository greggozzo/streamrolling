# Checking for vulnerabilities

Ways to check for security issues in this project: dependencies, env, and app behavior.

---

## 1. Dependencies (npm)

Known issues in packages are tracked in advisories. Check and fix:

```bash
# See report (critical / high / moderate / low)
npm audit

# Try to fix automatically (may bump versions)
npm audit fix

# Fix including breaking changes (can change behavior)
npm audit fix --force
```

Run these regularly (e.g. before releases and in CI). Focus on **critical** and **high** first.

**Add a script** (optional) so the team can run the same check:

```json
"scripts": {
  "security:audit": "npm audit"
}
```

Then: `npm run security:audit`.

---

## 2. Environment and secrets

- **Never commit** `.env`, `.env.local`, or any file with real secrets. Ensure they’re in `.gitignore`.
- In production (e.g. Vercel), confirm required env vars are set and that **no secret** is in a `NEXT_PUBLIC_*` variable.
- Rotate secrets if they might have been exposed (Stripe, Supabase service role, CRON_SECRET, etc.).

---

## 3. Supabase RLS

After enabling RLS (see `SUPABASE_RLS_SETUP.md`), verify it’s on and that anon can’t read other users’ data:

**In Supabase Dashboard → SQL Editor:**

```sql
-- RLS enabled?
SELECT relname, relrowsecurity
FROM pg_class
WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND relkind = 'r'
  AND relname IN ('user_shows', 'user_notification_preferences', 'notification_sent');
```

Expect `relrowsecurity = true` for tables you protected.

**Quick test:** With RLS on and no anon policy on `user_shows`, open the app in a browser, open DevTools → Network, and watch the Supabase requests when loading the dashboard. If the client no longer calls Supabase for `user_shows` (you switched to APIs), that’s expected. If the client still calls Supabase and gets no rows or errors, RLS is doing its job.

---

## 4. App and API behavior (manual / checklist)

Use `docs/SECURITY.md` as a checklist. In particular:

- [ ] All user-scoped API routes use `getAuth(request)` and scope by that `userId`.
- [ ] No secrets in client bundles (no `process.env.STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc. in client code).
- [ ] Stripe webhook verifies signature; cron requires `CRON_SECRET`.
- [ ] Debug or internal routes (e.g. `/api/debug-paid`) are disabled or restricted in production.
- [ ] Inputs (e.g. `tmdbId`, `mediaType`, `order`) are validated in the API.

---

## 5. Optional: automated scanning

- **GitHub:** Enable **Dependabot** (Security tab → Dependabot alerts) and **Code scanning** if you use GitHub.
- **Snyk:** `npx snyk test` (and optionally `snyk monitor`) for dependency and license issues after signing up.
- **Vercel:** No built-in vuln scanner; rely on `npm audit` and the steps above.

---

## Quick reference

| What to check        | How |
|----------------------|-----|
| Dependency CVEs      | `npm audit` then `npm audit fix` |
| Env / secrets        | No secrets in repo or `NEXT_PUBLIC_*`; rotate if leaked |
| Supabase RLS         | SQL above; confirm client can’t read other users’ data |
| API auth and inputs  | `docs/SECURITY.md` checklist |
| Optional automation  | Dependabot, Snyk, or CI running `npm audit` |

Running `npm audit` and the RLS check regularly, plus following the security checklist, is enough for a solid baseline.
