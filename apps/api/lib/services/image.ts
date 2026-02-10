import { v4 as uuidv4 } from 'uuid';
import { uploadToS3, deleteFromS3 } from '@/clients/AWS/s3Client';
import { logger } from '@/utils/logger';

class ImageService {
  /**
   * Upload an image to S3 and return the URL
   * @param imageData Base64 encoded image data
   * @param mimeType MIME type (e.g., 'image/jpeg')
   * @param folder Optional folder prefix (e.g., 'avatars', 'events')
   * @returns S3 URL of the uploaded image
   */
  static async uploadImage(imageData: string, mimeType: string, folder: string = 'images'): Promise<string> {
    try {
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Generate unique S3 key
      const extension = mimeType.split('/')[1];
      const uniqueId = uuidv4();
      const key = `${folder}/${uniqueId}.${extension}`;

      const url = await uploadToS3(key, buffer, mimeType);

      logger.info('Image uploaded successfully', { key, folder, size: buffer.length });

      return url;
    } catch (error) {
      logger.error('Error uploading image', { error });
      throw error;
    }
  }

  /**
   * Delete an image from S3 by URL
   * @param url S3 URL of the image
   */
  static async deleteImageByUrl(url: string): Promise<void> {
    try {
      const urlObj = new URL(url);
      const key = urlObj.pathname.substring(1); // Remove leading slash

      await deleteFromS3(key);

      logger.info('Image deleted successfully', { url, key });
    } catch (error) {
      logger.error('Error deleting image', { error });
      throw error;
    }
  }

  /**
   * Delete multiple images from S3
   * @param urls Array of S3 URLs
   */
  static async deleteImages(urls: string[]): Promise<void> {
    try {
      await Promise.all(urls.map((url) => this.deleteImageByUrl(url)));
      logger.info('Multiple images deleted', { count: urls.length });
    } catch (error) {
      logger.error('Error deleting multiple images', { error });
      throw error;
    }
  }
}

export default ImageService;
