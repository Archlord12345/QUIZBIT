import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const isVercel =
  process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);

if (isVercel) {
  process.exit(0);
}

const patchedPackage = path.join(
  'node_modules',
  'react-native-audio-recorder-player',
  'package.json',
);

if (!fs.existsSync(patchedPackage)) {
  process.exit(0);
}

execSync('npx patch-package', { stdio: 'inherit' });
