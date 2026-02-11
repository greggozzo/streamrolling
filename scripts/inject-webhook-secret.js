/**
 * Runs at build time (e.g. on Vercel) and writes STRIPE_WEBHOOK_SECRET into
 * lib/stripe-webhook-secret.generated.ts so the webhook route can read it.
 * Vercel injects env vars during build, so the value is available here.
 */
const fs = require('fs');
const path = require('path');

const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
const outPath = path.join(__dirname, '..', 'lib', 'stripe-webhook-secret.generated.ts');
const content = `// AUTO-GENERATED at build - do not edit. Injected from STRIPE_WEBHOOK_SECRET.
export default ${JSON.stringify(secret)};
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, content, 'utf8');
console.log('[inject-webhook-secret] Wrote lib/stripe-webhook-secret.generated.ts', secret ? '(secret present)' : '(empty - set STRIPE_WEBHOOK_SECRET in Vercel)');
