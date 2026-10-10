import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🎵 Synthesizing Apple-style Soundtrack and UI Sound Effects...');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--disable-gpu', '--no-sandbox']
  });

  const page = await browser.newPage();

  // Run Web Audio synthesis inside Chromium's OfflineAudioContext
  const wavBase64 = await page.evaluate(async () => {
    const sampleRate = 44100;
    const duration = 20.0;
    const totalSamples = Math.ceil(sampleRate * duration);
    const ctx = new OfflineAudioContext(2, totalSamples, sampleRate);

    // Master Compressor & Limiter to keep levels clean and punchy
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-14, 0);
    compressor.knee.setValueAtTime(8, 0);
    compressor.ratio.setValueAtTime(6, 0);
    compressor.attack.setValueAtTime(0.005, 0);
    compressor.release.setValueAtTime(0.12, 0);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.85, 0);
    masterGain.gain.setValueAtTime(0.85, 18.5);
    masterGain.gain.exponentialRampToValueAtTime(0.001, 20.0); // clean fadeout at the end

    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Reverb Convolver Simulation (Algorithmic Stereo Impulse)
    const reverbLength = sampleRate * 2.2;
    const impulseBuffer = ctx.createBuffer(2, reverbLength, sampleRate);
    for (let c = 0; c < 2; c++) {
      const channelData = impulseBuffer.getChannelData(c);
      for (let i = 0; i < reverbLength; i++) {
        const decay = Math.exp(-i / (sampleRate * 0.45));
        channelData[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    const reverbNode = ctx.createConvolver();
    reverbNode.buffer = impulseBuffer;
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.28;
    reverbNode.connect(reverbGain);
    reverbGain.connect(compressor);

    // Delay Node (Stereo Ping-Pong Delay)
    const delayNode = ctx.createDelay();
    delayNode.delayTime.value = 0.25; // 8th note at 120bpm
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.35;
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.22;
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(delayGain);
    delayGain.connect(compressor);

    // Helper: Play Kick Drum
    function playKick(time, gain = 0.9) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);
      g.gain.setValueAtTime(gain, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
      osc.connect(g);
      g.connect(compressor);
      osc.start(time);
      osc.stop(time + 0.2);
    }

    // Helper: Play Hi-hat / Shaker
    function playHat(time, gain = 0.12) {
      const bufferSize = sampleRate * 0.04;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.012));
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7500;
      const g = ctx.createGain();
      g.gain.value = gain;
      whiteNoise.connect(filter);
      filter.connect(g);
      g.connect(compressor);
      whiteNoise.start(time);
    }

    // Helper: Play Warm Bass Note
    function playBass(time, duration, freq, gain = 0.4) {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc2.type = 'sine';
      osc2.frequency.value = freq;
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, time);
      filter.frequency.exponentialRampToValueAtTime(120, time + duration);
      g.gain.setValueAtTime(gain, time);
      g.gain.setValueAtTime(gain * 0.85, time + duration - 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, time + duration);
      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(g);
      g.connect(compressor);
      osc.start(time);
      osc2.start(time);
      osc.stop(time + duration);
      osc2.stop(time + duration);
    }

    // Helper: Play Warm Synth Chord Voice
    function playSynthPad(time, duration, freqs, gain = 0.18) {
      const chordGain = ctx.createGain();
      chordGain.gain.setValueAtTime(0.001, time);
      chordGain.gain.linearRampToValueAtTime(gain, time + 0.25);
      chordGain.gain.setValueAtTime(gain, time + duration - 0.3);
      chordGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, time);
      filter.frequency.linearRampToValueAtTime(1400, time + duration * 0.5);
      filter.frequency.linearRampToValueAtTime(600, time + duration);

      freqs.forEach(freq => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.value = freq;
        osc2.type = 'triangle';
        osc2.frequency.value = freq * 1.003; // chorus detune
        osc1.connect(filter);
        osc2.connect(filter);
        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + duration);
        osc2.stop(time + duration);
      });

      filter.connect(chordGain);
      chordGain.connect(compressor);
      chordGain.connect(reverbNode);
    }

    // Helper: Play Bell Pluck Arpeggio
    function playPluck(time, freq, gain = 0.14) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(gain, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
      osc.connect(g);
      g.connect(compressor);
      g.connect(delayNode);
      osc.start(time);
      osc.stop(time + 0.3);
    }

    // -------------------------------------------------------------
    // 1. BACKING SOUNDTRACK (BPM 120, 20 Seconds Total)
    // -------------------------------------------------------------
    const bpm = 120;
    const beat = 60 / bpm; // 0.5s

    // Chord Progression (Fm7 -> DbMaj7 -> Ab -> Eb/G -> Climax F)
    // Scene 1 (0.0s - 2.8s): Ambient Pad (Fm7)
    playSynthPad(0.2, 2.6, [174.61, 207.65, 261.63, 311.13], 0.15); // F3, Ab3, C4, Eb4
    playBass(0.3, 2.4, 43.65, 0.35); // F1

    // Scene 2 (2.8s - 5.6s): Beat drops in, Intent 94 (DbMaj7)
    playSynthPad(2.8, 2.7, [138.59, 174.61, 207.65, 261.63], 0.22); // Db3, F3, Ab3, C4
    playBass(2.8, 2.6, 34.65, 0.42); // Db1

    // Scene 3 (5.6s - 8.4s): Name & Pay (AbMaj7)
    playSynthPad(5.6, 2.7, [207.65, 261.63, 311.13, 392.00], 0.22); // Ab3, C4, Eb4, G4
    playBass(5.6, 2.6, 51.91, 0.42); // Ab1

    // Scene 4 (8.4s - 11.2s): Waste Shield (Fm7 / C)
    playSynthPad(8.4, 2.7, [174.61, 207.65, 261.63, 349.23], 0.24); // F3, Ab3, C4, F4
    playBass(8.4, 2.6, 43.65, 0.45); // F1

    // Scene 5 (11.2s - 14.0s): Autofill (Bbm7 -> Db)
    playSynthPad(11.2, 2.7, [233.08, 277.18, 349.23, 415.30], 0.24); // Bb3, Db4, F4, Ab4
    playBass(11.2, 2.6, 58.27, 0.42); // Bb1

    // Scene 6 (14.0s - 16.8s): Agency Radar (Eb -> G)
    playSynthPad(14.0, 2.7, [155.56, 196.00, 233.08, 311.13], 0.26); // Eb3, G3, Bb3, Eb4
    playBass(14.0, 2.6, 38.89, 0.45); // Eb1

    // Scene 7 (16.8s - 20.0s): Grand Apple Keynote Climax Chord (F Radiant Major)
    playSynthPad(16.8, 3.1, [87.31, 130.81, 174.61, 220.00, 261.63, 349.23], 0.32); // F2, C3, F3, A3, C4, F4
    playBass(16.8, 2.9, 43.65, 0.5); // F1

    // Kicks & Shakers Groove (Starting from Scene 2 through Scene 6)
    for (let t = 2.8; t < 16.5; t += beat) {
      // Four on the floor kick with subtle syncopation
      playKick(t, 0.65);
      // Hi-hats on off-beats
      playHat(t + beat * 0.5, 0.14);
      playHat(t + beat * 0.75, 0.08);
    }
    // Final punch kick at climax
    playKick(16.8, 0.85);

    // Sparkling Arpeggio Pings (C4 - Eb4 - F4 - Ab4 - C5 - Eb5)
    const arpNotes = [261.63, 311.13, 349.23, 415.30, 523.25, 622.25];
    let noteIdx = 0;
    for (let t = 3.0; t < 16.5; t += beat * 0.5) {
      playPluck(t, arpNotes[noteIdx % arpNotes.length], 0.12);
      noteIdx++;
    }

    // -------------------------------------------------------------
    // 2. TACTILE APPLE UI SOUND EFFECTS (SFX)
    // -------------------------------------------------------------

    // SFX 1: Notch Opening Pneumatic Whoosh (0.4s)
    (function sfxNotchWhoosh() {
      const bufferSize = sampleRate * 0.4;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, 0.4);
      filter.frequency.exponentialRampToValueAtTime(180, 0.8);
      filter.Q.value = 3.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.28, 0.4);
      noiseSource.connect(filter);
      filter.connect(g);
      g.connect(compressor);
      g.connect(reverbNode);
      noiseSource.start(0.4);
    })();

    // SFX 1b: Cursive "hello" Shimmer Chimes (0.8s, 1.2s, 1.6s, 2.0s)
    const helloChimes = [1046.50, 1318.51, 1567.98, 2093.00]; // C6, E6, G6, C7
    helloChimes.forEach((freq, idx) => {
      const t = 0.8 + idx * 0.38;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(g);
      g.connect(compressor);
      g.connect(delayNode);
      g.connect(reverbNode);
      osc.start(t);
      osc.stop(t + 0.4);
    });

    // SFX 2: Notch Morph Pop & Intent Gauge Sweep (2.8s - 3.8s)
    (function sfxIntentGauge() {
      // Tactile Pop at 2.8s
      const pop = ctx.createOscillator();
      const popGain = ctx.createGain();
      pop.type = 'sine';
      pop.frequency.setValueAtTime(620, 2.8);
      pop.frequency.exponentialRampToValueAtTime(110, 2.85);
      popGain.gain.setValueAtTime(0.35, 2.8);
      popGain.gain.exponentialRampToValueAtTime(0.001, 2.87);
      pop.connect(popGain);
      popGain.connect(compressor);
      pop.start(2.8);
      pop.stop(2.88);

      // Gauge Count-up Rising Chime (3.0s - 3.7s)
      const gaugeNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      gaugeNotes.forEach((f, i) => {
        const t = 3.0 + i * 0.14;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.16, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        o.connect(g);
        g.connect(compressor);
        g.connect(reverbNode);
        o.start(t);
        o.stop(t + 0.3);
      });
    })();

    // SFX 3: Client Name & True Pay Haptic Double-Click (5.60s & 5.68s)
    [5.60, 5.68].forEach(t => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.025);
      g.gain.setValueAtTime(0.28, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
      osc.connect(g);
      g.connect(compressor);
      osc.start(t);
      osc.stop(t + 0.04);
    });

    // SFX 4: Connects Waste & Scam Shield Lock (8.4s)
    (function sfxShieldLock() {
      // Sub Thump
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(95, 8.4);
      sub.frequency.exponentialRampToValueAtTime(38, 8.55);
      subGain.gain.setValueAtTime(0.65, 8.4);
      subGain.gain.exponentialRampToValueAtTime(0.001, 8.65);
      sub.connect(subGain);
      subGain.connect(compressor);
      sub.start(8.4);
      sub.stop(8.7);

      // Warning Shield Ping Harmonic
      const alert = ctx.createOscillator();
      const alertGain = ctx.createGain();
      alert.type = 'triangle';
      alert.frequency.value = 587.33; // D5
      alertGain.gain.setValueAtTime(0.24, 8.4);
      alertGain.gain.exponentialRampToValueAtTime(0.001, 8.8);
      alert.connect(alertGain);
      alertGain.connect(compressor);
      alertGain.connect(reverbNode);
      alert.start(8.4);
      alert.stop(8.85);
    })();

    // SFX 5: Proposal Autofill Keystrokes (11.2s - 11.6s)
    [11.20, 11.28, 11.36, 11.44, 11.52].forEach((t, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800 + (i % 3) * 200, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.02);
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      osc.connect(g);
      g.connect(compressor);
      osc.start(t);
      osc.stop(t + 0.035);
    });

    // SFX 6: Agency Radar Sonar Ping (14.0s)
    (function sfxRadarPing() {
      const osc = ctx.createOscillator();
      const oscHarmonic = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880; // A5
      oscHarmonic.type = 'sine';
      oscHarmonic.frequency.value = 1760; // A6
      g.gain.setValueAtTime(0.32, 14.0);
      g.gain.exponentialRampToValueAtTime(0.001, 15.6);
      osc.connect(g);
      oscHarmonic.connect(g);
      g.connect(compressor);
      g.connect(delayNode);
      g.connect(reverbNode);
      osc.start(14.0);
      oscHarmonic.start(14.0);
      osc.stop(15.7);
      oscHarmonic.stop(15.7);
    })();

    // SFX 7: Hardware Notch Snap & Climax Keynote Resolve (16.8s)
    (function sfxNotchCloseSnap() {
      // Crisp mechanical snap
      const snap = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snap.type = 'sine';
      snap.frequency.setValueAtTime(1100, 16.8);
      snap.frequency.exponentialRampToValueAtTime(90, 16.84);
      snapGain.gain.setValueAtTime(0.42, 16.8);
      snapGain.gain.exponentialRampToValueAtTime(0.001, 16.86);
      snap.connect(snapGain);
      snapGain.connect(compressor);
      snap.start(16.8);
      snap.stop(16.88);

      // Shimmer Bell Chime at Finale
      [1046.50, 1318.51, 1567.98, 2093.00].forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.18, 16.8 + idx * 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, 19.5);
        o.connect(g);
        g.connect(compressor);
        g.connect(reverbNode);
        o.start(16.8 + idx * 0.06);
        o.stop(19.6);
      });
    })();

    // Render AudioBuffer
    const rendered = await ctx.startRendering();

    // Encode rendered AudioBuffer to 16-bit stereo WAV format
    const numChannels = rendered.numberOfChannels;
    const len = rendered.length;
    const blockAlign = numChannels * 2;
    const byteRate = sampleRate * blockAlign;
    const dataSize = len * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // Write RIFF header
    function writeString(offset, str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true);  // Audio format 1 (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // 16 bits per sample
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Interleave channels & write 16-bit PCM samples
    const leftData = rendered.getChannelData(0);
    const rightData = rendered.getChannelData(1);
    let offset = 44;
    for (let i = 0; i < len; i++) {
      // Left channel
      let sL = Math.max(-1, Math.min(1, leftData[i]));
      view.setInt16(offset, sL < 0 ? sL * 0x8000 : sL * 0x7FFF, true);
      offset += 2;
      // Right channel
      let sR = Math.max(-1, Math.min(1, rightData[i]));
      view.setInt16(offset, sR < 0 ? sR * 0x8000 : sR * 0x7FFF, true);
      offset += 2;
    }

    // Convert to base64 for transfer back to Node.js
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  });

  await browser.close();

  // Save WAV to disk
  const wavPath = path.resolve(__dirname, 'soundtrack.wav');
  const buffer = Buffer.from(wavBase64, 'base64');
  fs.writeFileSync(wavPath, buffer);
  console.log(`✓ Audio rendered successfully: ${wavPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

  // Multiplex with existing video using FFmpeg
  console.log('🎬 Multiplexing audio soundtrack with 1080p MP4 video via FFmpeg...');
  const inputVideo = path.resolve(__dirname, 'gigradar-apple-launch.mp4');
  const tempOutput = path.resolve(__dirname, 'gigradar-apple-launch-master.mp4');

  await new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-i', inputVideo,
      '-i', wavPath,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '256k',
      '-shortest',
      tempOutput
    ]);

    ffmpeg.stderr.on('data', (d) => {
      // process.stdout.write(d.toString());
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });

  // Replace master files
  fs.copyFileSync(tempOutput, inputVideo);
  fs.unlinkSync(tempOutput);

  // Also update landing directory copy
  const landingVideo = path.resolve(__dirname, '../landing/gigradar-apple-launch.mp4');
  fs.copyFileSync(inputVideo, landingVideo);

  console.log(`\n🎉 Success! Audio + Video master created:`);
  console.log(`  - launch-film/gigradar-apple-launch.mp4`);
  console.log(`  - landing/gigradar-apple-launch.mp4`);
  console.log(`  - launch-film/soundtrack.wav`);
}

main().catch(err => {
  console.error('Audio generation error:', err);
  process.exit(1);
});
