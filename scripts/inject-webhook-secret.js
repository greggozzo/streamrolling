/**
 * Runs at build time (e.g. on Vercel) and writes STRIPE_WEBHOOK_SECRET into
 * lib/stripe-webhook-secret.generated.ts so the webhook route can read it.
 */
const fs = require('fs');
const path = require('path');

const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
if (process.env.VERCEL && !secret) {
  console.error('');
  console.error('FATAL: STRIPE_WEBHOOK_SECRET is not set during build.');
  console.error('In Vercel: Project Settings → Environment Variables');
  console.error('  - Add STRIPE_WEBHOOK_SECRET (value = Stripe webhook signing secret, e.g. whsec_...)');
  console.error('  - Ensure Production (and Preview if needed) are selected');
  console.error('  - Redeploy and do NOT use "Use existing build cache"');
  console.error('');
  process.exit(1);
}

const outPath = path.join(__dirname, '..', 'lib', 'stripe-webhook-secret.generated.ts');
const content = `// AUTO-GENERATED at build - do not edit. Injected from STRIPE_WEBHOOK_SECRET.
export default ${JSON.stringify(secret)};
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, content, 'utf8');
console.log('[inject-webhook-secret] Wrote lib/stripe-webhook-secret.generated.ts', secret ? '(secret present)' : '(empty)');
