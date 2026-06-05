const crypto = require('crypto');
const { getEnv } = require('./env');

const parseCloudinaryUrl = () => {
  const url = getEnv('CLOUDINARY_URL');
  if (!url) return {};
  const match = String(url).match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!match) return {};
  return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
};

const getCloudinaryConfig = () => {
  const fromUrl = parseCloudinaryUrl();
  return {
    cloudName:
      getEnv('CLOUDINARY_CLOUD_NAME', 'REACT_APP_CLOUDINARY_CLOUD_NAME') ||
      fromUrl.cloudName ||
      '',
    apiKey: getEnv('CLOUDINARY_API_KEY') || fromUrl.apiKey || '',
    apiSecret: getEnv('CLOUDINARY_API_SECRET') || fromUrl.apiSecret || '',
    uploadPreset: getEnv('CLOUDINARY_UPLOAD_PRESET') || '',
  };
};

const signParams = (params, apiSecret) => {
  const sorted = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(sorted + apiSecret).digest('hex');
};

const uploadImageBase64 = async ({
  imageBase64,
  mimeType = 'image/jpeg',
  folder = 'quizbit/avatars',
}) => {
  const config = getCloudinaryConfig();
  if (!config.cloudName) {
    throw new Error('CLOUDINARY_CLOUD_NAME manquant.');
  }

  const cleanBase64 = String(imageBase64 || '')
    .replace(/^data:[^;]+;base64,/, '')
    .trim();
  if (!cleanBase64) {
    throw new Error('Image base64 manquante.');
  }

  const maxBytes = 4 * 1024 * 1024;
  const approxBytes = Math.floor((cleanBase64.length * 3) / 4);
  if (approxBytes > maxBytes) {
    throw new Error('Image trop volumineuse (max 4 Mo).');
  }

  const dataUri = `data:${mimeType};base64,${cleanBase64}`;
  const formData = new FormData();

  if (config.apiKey && config.apiSecret) {
    const timestamp = Math.round(Date.now() / 1000);
    const params = { folder, timestamp };
    const signature = signParams(params, config.apiSecret);
    formData.append('file', dataUri);
    formData.append('api_key', config.apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);
    formData.append('folder', folder);
  } else if (config.uploadPreset) {
    formData.append('upload_preset', config.uploadPreset);
    formData.append('file', dataUri);
  } else {
    throw new Error(
      'Cloudinary non configure (CLOUDINARY_API_KEY/SECRET ou UPLOAD_PRESET requis).',
    );
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    { method: 'POST', body: formData },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.secure_url) {
    throw new Error(data?.error?.message || 'Upload Cloudinary impossible.');
  }

  return { url: data.secure_url, publicId: data.public_id };
};

module.exports = {
  getCloudinaryConfig,
  uploadImageBase64,
};
