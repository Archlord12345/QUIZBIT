const fs = require('fs');
const path = require('path');

let cachedEnv = null;

const parseEnvFile = filePath => {
  try {
    if (!fs.existsSync(filePath)) return {};
    return fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .reduce((acc, line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
          return acc;
        }
        const index = trimmed.indexOf('=');
        const key = trimmed.slice(0, index).trim();
        const value = trimmed.slice(index + 1).trim();
        acc[key] = value;
        return acc;
      }, {});
  } catch {
    return {};
  }
};

const loadCommittedEnv = () => {
  if (cachedEnv) return cachedEnv;

  const candidates = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'vercel', '.env'),
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '..', '.env'),
    path.join(__dirname, '..', '..', 'vercel', '.env'),
  ];

  cachedEnv = candidates.reduce(
    (acc, filePath) => ({
      ...acc,
      ...parseEnvFile(filePath),
    }),
    {},
  );
  return cachedEnv;
};

const getEnv = (...keys) => {
  const committedEnv = loadCommittedEnv();
  for (const key of keys) {
    const value = process.env[key] || committedEnv[key];
    if (value) return value;
  }
  return '';
};

module.exports = { getEnv };
