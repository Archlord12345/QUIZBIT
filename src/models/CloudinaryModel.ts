import { Buffer } from 'buffer';
import Config from 'react-native-config';
import { apiPost } from '../utils/api';

type RuntimeConfig = Record<string, string | undefined>;

export type CloudinaryUploadResult = {
  url: string;
  publicId?: string;
};

type CloudinaryUploadResponse = {
  ok: boolean;
  url: string;
  publicId?: string;
  message?: string;
};

class CloudinaryModel {
  private cloudName = this.readRuntimeValue('CLOUDINARY_CLOUD_NAME');
  private uploadPreset = this.readRuntimeValue('CLOUDINARY_UPLOAD_PRESET');

  isConfigured() {
    return Boolean(this.cloudName && this.uploadPreset);
  }

  async uploadImage(
    uri: string,
    idToken?: string,
    mimeType = 'image/jpeg',
  ): Promise<CloudinaryUploadResult> {
    const cleanUri = uri.trim();
    if (!cleanUri) {
      throw new Error('URI image manquante.');
    }

    if (this.cloudName && this.uploadPreset) {
      return this.uploadDirect(cleanUri);
    }

    if (!idToken) {
      throw new Error('Session requise pour envoyer la photo de profil.');
    }

    return this.uploadViaServer(cleanUri, idToken, mimeType);
  }

  private async uploadDirect(uri: string): Promise<CloudinaryUploadResult> {
    const formData = new FormData();
    formData.append('upload_preset', this.uploadPreset);
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: `quizbit-avatar-${Date.now()}.jpg`,
    } as unknown as Blob);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      },
    );
    const data = await response.json();

    if (!response.ok || !data.secure_url) {
      throw new Error(data?.error?.message || 'Upload Cloudinary impossible.');
    }

    return {
      url: data.secure_url,
      publicId: data.public_id,
    };
  }

  private async uploadViaServer(
    uri: string,
    idToken: string,
    mimeType: string,
  ): Promise<CloudinaryUploadResult> {
    const imageBase64 = await this.readUriAsBase64(uri);
    const response = await apiPost<CloudinaryUploadResponse>(
      '/api/cloudinary-upload',
      {
        idToken,
        imageBase64,
        mimeType,
      },
    );

    if (!response.url) {
      throw new Error('URL Cloudinary manquante apres upload.');
    }

    return {
      url: response.url,
      publicId: response.publicId,
    };
  }

  private async readUriAsBase64(uri: string): Promise<string> {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error('Impossible de lire la photo selectionnee.');
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  }

  private readRuntimeValue(name: string): string {
    const nativeConfig = Config as unknown as RuntimeConfig;
    const maybeProcess = (
      globalThis as unknown as { process?: { env?: Record<string, string> } }
    ).process;
    return nativeConfig[name] || maybeProcess?.env?.[name] || '';
  }
}

export default new CloudinaryModel();
