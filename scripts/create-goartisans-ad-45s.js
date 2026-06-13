const { spawn } = require('child_process');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');

const root = 'C:/Projects/job seaking app';
const images = [
  'mobile/screen1.png',
  'mobile/screen2.png',
  'mobile/screen3.png',
  'mobile/screen4.png',
  'mobile/screen5.png',
  'mobile/screen6.png',
  'mobile/screen_fixed.png',
  'mobile/screen_now.png',
  'mobile/screen2.png',
].map((p) => path.join(root, p));

const texts = [
  'GOARTISANS',
  'Find trusted artisans fast',
  'Explore jobs near you',
  'Apply in minutes',
  'Show your skills',
  'Build your reputation',
  'Connect with real clients',
  'Grow your income',
  'Download GoArtisans today',
];

const output = path.join(root, 'frontend/frontend/frontend/public/ads/goartisans-45s-en.mp4');

const args = ['-y'];
for (const img of images) {
  args.push('-loop', '1', '-t', '5', '-i', img);
}

const sceneFilters = texts.map((text, i) => {
  const safeText = text.replace(/:/g, '\\:').replace(/'/g, "\\'");
  return `[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p,` +
    `drawtext=text='${safeText}':x=(w-text_w)/2:y=h-220:fontsize=56:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=18[v${i}]`;
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
