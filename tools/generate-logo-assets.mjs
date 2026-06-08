import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const root = process.cwd();
const source = path.join(root, 'logo', 'quizbit-logo.png');
const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');
const panelLogos = [
  { label: 'Mobile app', path: path.join(root, 'src', 'assets', 'logo.png') },
  {
    label: 'Panel Vercel',
    path: path.join(root, 'vercel', 'src', 'assets', 'logo.png'),
  },
  {
    label: 'Panel local',
    path: path.join(root, 'local', 'assets', 'logo.png'),
  },
];
const splashLogo = path.join(androidRes, 'drawable-nodpi', 'logo_splash.png');

const launcherTargets = [
  ['mipmap-mdpi', 48],
  ['mipmap-hdpi', 72],
  ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144],
  ['mipmap-xxxhdpi', 192],
];

const ensureSource = async () => {
  try {
    await fs.access(source);
  } catch {
    throw new Error(
      `Logo source missing: ${path.relative(root, source)}\n` +
        'Add the official logo PNG to logo/quizbit-logo.png, then run npm run logo again.',
    );
  }
};

// Launcher icons get the branded blue gradient backdrop (matches the splash),
// so the app icon reads as a finished badge instead of a logo floating on a
// transparent square.
const ICON_BG_TOP = '#152a63';
const ICON_BG_BOTTOM = '#1d4ed8';

const gradientBackground = size =>
  Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">` +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      `<stop offset="0" stop-color="${ICON_BG_TOP}"/>` +
      `<stop offset="1" stop-color="${ICON_BG_BOTTOM}"/>` +
      '</linearGradient></defs>' +
      `<rect width="${size}" height="${size}" fill="url(#g)"/>` +
      '</svg>',
  );

const makeSquare = async size => {
  const inner = Math.round(size * 0.74);
  const offset = Math.round((size - inner) / 2);
  const logo = await sharp(source)
    .resize(inner, inner, {
      fit: 'contain',
      background: { r: 5, g: 8, b: 22, alpha: 0 },
    })
    .png()
    .toBuffer();
  return sharp(gradientBackground(size))
    .composite([{ input: logo, top: offset, left: offset }])
    .png();
};

const makeRound = async size => {
  const radius = size / 2;
  const base = await (await makeSquare(size)).toBuffer();
  const svgMask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="white"/></svg>`,
  );
  return sharp(base).composite([{ input: svgMask, blend: 'dest-in' }]).png();
};

const writePanelLogo = async targetPath =>
  sharp(source)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 5, g: 8, b: 22, alpha: 0 },
    })
    .png()
    .toFile(targetPath);

await ensureSource();
await fs.mkdir(path.dirname(splashLogo), { recursive: true });

for (const logo of panelLogos) {
  await fs.mkdir(path.dirname(logo.path), { recursive: true });
  await writePanelLogo(logo.path);
}

await sharp(source)
  .resize(420, 420, { fit: 'contain', background: { r: 5, g: 8, b: 22, alpha: 0 } })
  .png()
  .toFile(splashLogo);

for (const [folder, size] of launcherTargets) {
  const dir = path.join(androidRes, folder);
  await fs.mkdir(dir, { recursive: true });
  const square = await makeSquare(size);
  await square.toFile(path.join(dir, 'ic_launcher.png'));
  const round = await makeRound(size);
  await round.toFile(path.join(dir, 'ic_launcher_round.png'));
}

console.log('QuizBit logo assets generated from logo/quizbit-logo.png');
for (const logo of panelLogos) {
  console.log(`- ${logo.label}: ${path.relative(root, logo.path)}`);
}
console.log('- Android splash + launcher icons');
