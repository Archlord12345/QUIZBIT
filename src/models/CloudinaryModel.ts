import Config from 'react-native-config';

type RuntimeConfig = Record<string, string | undefined>;

export type CloudinaryUploadResult = {
  url: string;
  publicId?: string;
};

class CloudinaryModel {
  private cloudName = this.readRuntimeValue('CLOUDINARY_CLOUD_NAME');
  private uploadPreset = this.readRuntimeValue('CLOUDINARY_UPLOAD_PRESET');

  isConfigured() {
    return Boolean(this.cloudName && this.uploadPreset);
  }

  async uploadImage(uri: string): Promise<CloudinaryUploadResult> {
    const cleanUri = uri.trim();
    if (!cleanUri) {
      throw new Error('URI image manquante.');
    }

    if (!this.isConfigured()) {
      return { url: cleanUri };
    }

    const formData = new FormData();
    formData.append('upload_preset', this.uploadPreset);
    formData.append('file', {
      uri: cleanUri,
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

  private readRuntimeValue(name: string): string {
    const nativeConfig = Config as unknown as RuntimeConfig;
    const maybeProcess = (
      globalThis as unknown as { process?: { env?: Record<string, string> } }
    ).process;
    return nativeConfig[name] || maybeProcess?.env?.[name] || '';
  }
}

export default new CloudinaryModel();
