import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startStaticServer(port = 5173) {
  try {
    const res = await fetch(`http://localhost:${port}`);
    if (res.ok) {
      console.log(`[Server] Found existing server running at http://localhost:${port}`);
      return null;
    }
  } catch (e) {
    // Port not active, start static server
  }

  const landingDist = path.resolve(__dirname, '../../gigradar-landing/dist');
  const landingSrc = path.resolve(__dirname, '../../gigradar-landing');
  const serveDir = fs.existsSync(path.join(landingDist, 'index.html')) ? landingDist : landingSrc;

  console.log(`[Server] Serving static files from: ${serveDir}`);

  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.json': 'application/json'
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    const filePath = path.join(serveDir, reqPath);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        fs.readFile(path.join(serveDir, 'index.html'), (errIndex, dataIndex) => {
          if (errIndex) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(dataIndex);
          }
        });
      } else {
        const ext = path.extname(filePath);
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      }
    });
  });

  await new Promise((resolve) => server.listen(port, resolve));
  console.log(`[Server] Local server running at http://localhost:${port}`);
  return server;
}

async function captureStoreShots() {
  const targetDir = path.resolve(__dirname, '../docs/store');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const server = await startStaticServer(5173);

  console.log('[Playwright] Launching Chromium browser (1280x800)...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();

  console.log('[Playwright] Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // =========================================================================
  // SHOT 1: FEED & HERO INTEL OVERVIEW (1280x800)
  // =========================================================================
  console.log('[Playwright] Capturing Shot 1: Feed Badges & Intel Overview...');
  const intelTab = page.locator('button[data-tab="intel"]');
  if (await intelTab.count() > 0) {
    await intelTab.click();
    await page.waitForTimeout(200);
  }

  await page.evaluate(() => {
    const el = document.getElementById('inspector');
    if (el) {
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const targetY = window.scrollY + rect.top - (windowHeight - rect.height) / 2 + 10;
      window.scrollTo({ top: targetY, behavior: 'instant' });
    }
  });
  await page.waitForTimeout(400);

  const shot1Path = path.join(targetDir, 'screenshot1.png');
  await page.screenshot({ path: shot1Path });
  console.log(`[Playwright] Saved: ${shot1Path} (1280x800)`);

  // =========================================================================
  // SHOT 2: RED-FLAGS PANEL / BEFORE & AFTER DIFF (1280x800)
  // =========================================================================
  console.log('[Playwright] Capturing Shot 2: Red-Flag Waste Panel / Diff...');
  await page.evaluate(() => {
    const diffCard = document.querySelector('.diff-terminal-card');
    if (diffCard) {
      const rect = diffCard.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const targetY = window.scrollY + rect.top - (windowHeight - rect.height) / 2 + 15;
      window.scrollTo({ top: targetY, behavior: 'instant' });
    }
  });
  await page.waitForTimeout(400);

  const shot2Path = path.join(targetDir, 'screenshot2.png');
  await page.screenshot({ path: shot2Path });
  console.log(`[Playwright] Saved: ${shot2Path} (1280x800)`);

  // =========================================================================
  // SHOT 3: UNBLURRED PROPOSAL HOOKS GENERATOR (1280x800)
  // =========================================================================
  console.log('[Playwright] Capturing Shot 3: Unblurred Proposal Hooks...');
  await page.evaluate(() => {
    const el = document.getElementById('inspector');
    if (el) {
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const targetY = window.scrollY + rect.top - (windowHeight - rect.height) / 2 + 10;
      window.scrollTo({ top: targetY, behavior: 'instant' });
    }
  });
  await page.waitForTimeout(200);

  const hooksTab = page.locator('button[data-tab="hooks"]');
  if (await hooksTab.count() > 0) {
    await hooksTab.click();
    await page.waitForTimeout(300);
  }

  const shot3Path = path.join(targetDir, 'screenshot3.png');
  await page.screenshot({ path: shot3Path });
  console.log(`[Playwright] Saved: ${shot3Path} (1280x800)`);

  await browser.close();
  if (server) {
    server.close();
  }

  console.log('✅ All 3 store screenshots successfully captured at exact 1280x800:');
  console.log(`  1. ${shot1Path}`);
  console.log(`  2. ${shot2Path}`);
  console.log(`  3. ${shot3Path}`);
}

captureStoreShots().catch((err) => {
  console.error('[Error] Failed to capture store shots:', err);
  process.exit(1);
});
