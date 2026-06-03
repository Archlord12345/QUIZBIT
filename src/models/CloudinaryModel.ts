import { apiPost } from '../utils/api';

export type CloudinaryUploadResult = {
  url: string;
  publicId?: string;
};

type CloudinaryUploadResponse = {
  ok: boolean;
  upload: CloudinaryUploadResult;
};

class CloudinaryModel {
  async uploadImage(uri: string): Promise<CloudinaryUploadResult> {
    const cleanUri = uri.trim();
    if (!cleanUri) {
      throw new Error('URI image manquante.');
    }

    const response = await apiPost<CloudinaryUploadResponse>(
      '/api/cloudinary-upload',
      {
        uri: cleanUri,
      },
    );
    return response.upload;
  }
}

export default new CloudinaryModel();
