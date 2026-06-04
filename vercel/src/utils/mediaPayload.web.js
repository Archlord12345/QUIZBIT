const MAX_AUDIO_BYTES = 3.5 * 1024 * 1024;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_VIDEO_BYTES = 3.5 * 1024 * 1024;
const MAX_PDF_BYTES = 3.5 * 1024 * 1024;
const MAX_TEXT_CHARS = 12000;

export const MEDIA_ACCEPT = {
  audio: 'audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac',
  image: 'image/*,.png,.jpg,.jpeg,.webp,.gif',
  video: 'video/*,.mp4,.mov,.webm,.mkv',
  document: '.pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.csv,.json,text/plain',
  any: 'audio/*,video/*,image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.csv,text/plain',
};

export const classifyFile = file => {
  const mime = String(file?.type || '').toLowerCase();
  const name = String(file?.name || '').toLowerCase();

  if (mime.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(name)) {
    return 'audio';
  }
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(name)) {
    return 'image';
  }
  if (mime.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/i.test(name)) {
    return 'video';
  }
  if (
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    /\.(txt|md|csv)$/i.test(name)
  ) {
    return 'text';
  }
  if (mime === 'application/pdf' || /\.pdf$/i.test(name)) {
    return 'document';
  }
  return 'document';
};

const readAsBase64 = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || '');
      const base64 = raw.includes(',') ? raw.split(',')[1] : raw;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });

const readAsText = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Lecture texte impossible.'));
    reader.readAsText(file);
  });

const maxBytesFor = category => {
  if (category === 'image') return MAX_IMAGE_BYTES;
  if (category === 'video') return MAX_VIDEO_BYTES;
  if (category === 'audio') return MAX_AUDIO_BYTES;
  return MAX_PDF_BYTES;
};

export const buildMediaPayloadFromFile = async file => {
  if (!file) return null;

  const category = classifyFile(file);
  const mimeType = file.type || guessMime(category);
  const fileName = file.name || 'support';

  if (category === 'text') {
    const textContent = (await readAsText(file)).slice(0, MAX_TEXT_CHARS);
    return { category, mimeType, fileName, textContent, size: file.size };
  }

  if (file.size > maxBytesFor(category)) {
    throw new Error(
      `Fichier trop volumineux (max ${Math.round(maxBytesFor(category) / 1024 / 1024)} Mo).`,
    );
  }

  const base64 = await readAsBase64(file);
  return {
    category,
    mimeType,
    fileName,
    base64,
    size: file.size,
  };
};

const guessMime = category => {
  if (category === 'audio') return 'audio/mpeg';
  if (category === 'image') return 'image/jpeg';
  if (category === 'video') return 'video/mp4';
  if (category === 'text') return 'text/plain';
  return 'application/pdf';
};

export const formatBytes = bytes => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

export const categoryLabel = category => {
  const labels = {
    audio: 'Audio',
    image: 'Image',
    video: 'Vidéo',
    text: 'Texte',
    document: 'Document',
  };
  return labels[category] || 'Fichier';
};
