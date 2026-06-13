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
  'Boost your visibility',
  'Get instant alerts',
  'Find artisans or jobs today',
];

const voice = path.join(root, 'scripts/ad-assets/voiceover-en-45s.wav');
const music = path.join(root, 'scripts/ad-assets/music-bed-45s.wav');
const output = path.join(root, 'frontend/frontend/frontend/public/ads/goartisans-45s-en-premium.mp4');

const args = ['-y'];
for (const img of images) {
  args.push('-loop', '1', '-t', '5', '-i', img);
}
args.push('-i', voice, '-i', music);

const sceneFilters = texts.map((text, i) => {
  const safeText = text.replace(/:/g, '\\:').replace(/'/g, "\\'");
  return `[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
    `drawtext=text='${safeText}':x=(w-text_w)/2:y=h-170:fontsize=52:fontcolor=white:box=1:boxcolor=black@0.45:boxborderw=16[v${i}]`;
});

const concatInputs = texts.map((_, i) => `[v${i}]`).join('');
const videoChain = `${sceneFilters.join(';')};${concatInputs}concat=n=${texts.length}:v=1:a=0,trim=duration=45,format=yuv420p[vv]`;
const audioChain = `[9:a]atrim=0:45,asetpts=PTS-STARTPTS,volume=1.35[voice];` +
  `[10:a]atrim=0:45,asetpts=PTS-STARTPTS,volume=0.22[music];` +
  `[music][voice]amix=inputs=2:duration=first:normalize=0[aout]`;

args.push(
  '-filter_complex', `${videoChain};${audioChain}`,
  '-map', '[vv]',
  '-map', '[aout]',
  '-r', '30',
  '-c:v', 'libx264',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-pix_fmt', 'yuv420p',
  '-shortest',
  '-movflags', '+faststart',
  output
);

console.log('Rendering premium 45s ad to:', output);
const ff = spawn(ffmpegPath, args, { stdio: 'inherit' });
ff.on('exit', (code) => {
  if (code === 0) {
    console.log('Done. Premium video created successfully.');
  } else {
    console.error('ffmpeg failed with code', code);
    process.exit(code || 1);
  }
});
