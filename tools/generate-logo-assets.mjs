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

const makeSquare = size =>
  sharp(source)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 5, g: 8, b: 22, alpha: 0 },
    })
    .png();

const makeRound = size => {
  const radius = size / 2;
  const svgMask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="white"/></svg>`,
  );
  return makeSquare(size).composite([{ input: svgMask, blend: 'dest-in' }]).png();
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
  await makeSquare(size).toFile(path.join(dir, 'ic_launcher.png'));
  await makeRound(size).toFile(path.join(dir, 'ic_launcher_round.png'));
}

console.log('QuizBit logo assets generated from logo/quizbit-logo.png');
for (const logo of panelLogos) {
  console.log(`- ${logo.label}: ${path.relative(root, logo.path)}`);
}
console.log('- Android splash + launcher icons');
