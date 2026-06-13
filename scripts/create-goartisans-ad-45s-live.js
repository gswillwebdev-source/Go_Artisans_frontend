const { spawn } = require('child_process');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');

const root = 'C:/Projects/job seaking app';
const images = [
  'scripts/ad-assets/01-home.png',
  'scripts/ad-assets/02-workers.png',
  'scripts/ad-assets/03-browse-workers.png',
  'scripts/ad-assets/04-jobs.png',
  'scripts/ad-assets/05-register.png',
  'scripts/ad-assets/06-login.png',
  'scripts/ad-assets/07-pricing.png',
  'scripts/ad-assets/08-notifications.png',
  'scripts/ad-assets/09-home-cta.png',
].map((p) => path.join(root, p));

const texts = [
  'GOARTISANS',
  'Find trusted artisans fast',
  'Browse skilled workers near you',
  'Discover jobs in seconds',
  'Create your account easily',
  'Log in and start applying',
  'Unlock premium visibility',
  'Stay updated with alerts',
  'Find artisans or jobs today',
];

const output = path.join(root, 'frontend/frontend/frontend/public/ads/goartisans-45s-en.mp4');

const args = ['-y'];
for (const img of images) {
  args.push('-loop', '1', '-t', '5', '-i', img);
}

const sceneFilters = texts.map((text, i) => {
  const safeText = text.replace(/:/g, '\\:').replace(/'/g, "\\'");
  return `[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p,` +
    `drawtext=text='${safeText}':x=(w-text_w)/2:y=h-220:fontsize=58:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=20[v${i}]`;
});

const concatInputs = texts.map((_, i) => `[v${i}]`).join('');
const filterComplex = `${sceneFilters.join(';')};${concatInputs}concat=n=${texts.length}:v=1:a=0,format=yuv420p[vout]`;

args.push(
  '-filter_complex', filterComplex,
  '-map', '[vout]',
  '-r', '30',
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  output
);

console.log('Rendering 45s ad to:', output);
const ff = spawn(ffmpegPath, args, { stdio: 'inherit' });
ff.on('exit', (code) => {
  if (code === 0) {
    console.log('Done. Video created successfully.');
  } else {
    console.error('ffmpeg failed with code', code);
    process.exit(code || 1);
  }
});
