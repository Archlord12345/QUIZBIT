import { Buffer } from 'buffer';
import type { ThemeMedia } from './themeMediaPicker';

export type ThemeMediaCategory = 'audio' | 'image' | 'video' | 'text' | 'document';

export type ThemeMediaPayload = {
  category: ThemeMediaCategory;
  mimeType: string;
  fileName: string;
  base64?: string;
  textContent?: string;
};

const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_TEXT_CHARS = 8000;

export const classifyThemeMedia = (media: ThemeMedia): ThemeMediaCategory => {
  const mime = String(media.type || '').toLowerCase();
  const name = String(media.name || '').toLowerCase();

  if (
    mime.startsWith('audio/') ||
    /\.(mp3|wav|m4a|aac|ogg|flac|mp4)$/i.test(name) ||
    name.startsWith('theme-vocal-')
  ) {
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
  return 'document';
};

const readUriAsBase64 = async (uri: string): Promise<string> => {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Impossible de lire le fichier selectionne.');
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
};

const readUriAsText = async (uri: string): Promise<string> => {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Impossible de lire le document texte.');
  }
  return response.text();
};

const normalizeMime = (media: ThemeMedia, category: ThemeMediaCategory) => {
  if (media.type) return media.type;
  if (category === 'audio') return 'audio/mpeg';
  if (category === 'image') return 'image/jpeg';
  if (category === 'video') return 'video/mp4';
  if (category === 'text') return 'text/plain';
  return 'application/octet-stream';
};

export const buildThemeMediaPayload = async (
  media: ThemeMedia | null,
): Promise<ThemeMediaPayload | null> => {
  if (!media?.uri) return null;

  const category = classifyThemeMedia(media);
  const mimeType = normalizeMime(media, category);
  const fileName = media.name || 'support-theme';

  if (category === 'text') {
    const textContent = (await readUriAsText(media.uri)).slice(0, MAX_TEXT_CHARS);
    return { category, mimeType, fileName, textContent };
  }

  if (category === 'document') {
    return {
      category,
      mimeType,
      fileName,
      textContent: `Document fourni: ${fileName}. Utilise le nom et le type comme indice de theme si le contenu n est pas lisible.`,
    };
  }

  const maxBytes = category === 'image' ? MAX_IMAGE_BYTES : MAX_AUDIO_BYTES;
  if (media.size && media.size > maxBytes) {
    const label =
      category === 'audio'
        ? 'Audio trop volumineux (max 4 Mo).'
        : 'Image trop volumineuse (max 3 Mo).';
    throw new Error(label);
  }

  const base64 = await readUriAsBase64(media.uri);
  const byteLength = Math.floor((base64.length * 3) / 4);
  if (byteLength > maxBytes) {
    throw new Error(
      category === 'audio'
        ? 'Audio trop volumineux (max 4 Mo).'
        : 'Fichier media trop volumineux.',
    );
  }

  return { category, mimeType, fileName, base64 };
};

export const themeLabelFromMedia = (media: ThemeMedia | null) => {
  if (!media) return '';
  const category = classifyThemeMedia(media);
  const base = media.name.replace(/\.[^.]+$/, '').trim();
  if (category === 'audio') {
    return base || 'Quiz depuis extrait audio';
  }
  return base || media.name;
};
