/**
 * Generate public/favicon.ico from public/logo.jpg.
 * Run: node scripts/generate-favicon.js
 * Requires: npm install --save-dev sharp png-to-ico
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

const projectRoot = path.join(__dirname, '..');
const logoPath = path.join(projectRoot, 'public', 'logo.jpg');
const outPath = path.join(projectRoot, 'public', 'favicon.ico');
const sizes = [16, 32, 48];

async function main() {
  const sharp = require('sharp');
  const { default: pngToIco } = await import('png-to-ico');

  if (!fs.existsSync(logoPath)) {
    console.error('Missing public/logo.jpg. Add your logo there first.');
    process.exit(1);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'favicon-'));
  const pngPaths = [];

  try {
    for (const size of sizes) {
      const pngPath = path.join(tmpDir, `favicon-${size}.png`);
      await sharp(logoPath)
        .resize(size, size)
        .png()
        .toFile(pngPath);
      pngPaths.push(pngPath);
    }

    const icoBuffer = await pngToIco(pngPaths);
    fs.writeFileSync(outPath, icoBuffer);
    console.log('Wrote public/favicon.ico');
  } finally {
    for (const p of pngPaths) {
      try { fs.unlinkSync(p); } catch (_) {}
    }
    try { fs.rmdirSync(tmpDir); } catch (_) {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
