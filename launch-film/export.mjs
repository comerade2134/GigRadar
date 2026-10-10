import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🚀 Starting Apple Launch Film Keyframe & Video Pipeline...');
  
  const htmlPath = path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
  const targetUrl = `file:///${htmlPath}?render=1`;

  const framesDir = path.resolve(__dirname, 'keyframes');
  if (!fs.existsSync(framesDir)) {
    fs.mkdirSync(framesDir, { recursive: true });
  }

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  console.log(`Loading stage: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'load' });
  await page.waitForTimeout(500);

  // Keyframe moments to capture for visual review
  const keyframes = [
    { name: 'scene-1-hello.png', time: 1.8, desc: 'Scene 1: Handwritten hello in notch' },
    { name: 'scene-2-intent.png', time: 4.2, desc: 'Scene 2: Client Intent 94 gauge' },
    { name: 'scene-3-name.png', time: 7.0, desc: 'Scene 3: Client Name & True Pay' },
    { name: 'scene-4-shield.png', time: 9.8, desc: 'Scene 4: Waste & Scam Shield' },
    { name: 'scene-5-autofill.png', time: 12.6, desc: 'Scene 5: 1-Click Proposal Autofill' },
    { name: 'scene-6-agency.png', time: 15.4, desc: 'Scene 6: Agency Team Sync Radar' },
    { name: 'scene-7-finale.png', time: 18.5, desc: 'Scene 7: GigRadar OS Hero Finale' }
  ];

  console.log('📸 Capturing keyframe snapshots for each scene...');
  for (const kf of keyframes) {
    await page.evaluate((t) => window.seek(t), kf.time);
    await page.waitForTimeout(50);
    const savePath = path.join(framesDir, kf.name);
    await page.screenshot({ path: savePath });
    console.log(`  ✓ Captured ${kf.name} (${kf.time}s) — ${kf.desc}`);
  }

  // Check if --video flag is passed
  const shouldRenderVideo = process.argv.includes('--video');
  if (!shouldRenderVideo) {
    console.log('\n✨ Keyframes successfully generated in launch-film/keyframes!');
    console.log('Run `node export.mjs --video` to render the full 600-frame 1080p MP4.');
    await browser.close();
    return;
  }

  // Full MP4 render
  console.log('\n🎬 Rendering full 1080p 30fps MP4 video via ffmpeg...');
  const outputFile = path.resolve(__dirname, 'gigradar-apple-launch.mp4');

  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-r', '30',
    '-i', '-',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'medium',
    '-crf', '18',
    outputFile
  ]);

  ffmpeg.stderr.on('data', (data) => {
    // print ffmpeg output if error or every 5s
    const msg = data.toString();
    if (msg.includes('Error') || msg.includes('frame=')) {
      process.stdout.write(`\r${msg.trim().split('\n').pop()}`);
    }
  });

  const totalFrames = 600; // 20 seconds * 30 fps
  const fps = 30;

  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps;
    await page.evaluate((currTime) => window.seek(currTime), t);
    const buf = await page.screenshot({ type: 'png' });
    ffmpeg.stdin.write(buf);
    if (f % 30 === 0) {
      process.stdout.write(`\rRendering frame ${f}/${totalFrames} (${(t).toFixed(1)}s)...`);
    }
  }

  ffmpeg.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`\n\n🎉 Video export complete: ${outputFile}`);
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });

  await browser.close();
}

main().catch((err) => {
  console.error('Export error:', err);
  process.exit(1);
});
