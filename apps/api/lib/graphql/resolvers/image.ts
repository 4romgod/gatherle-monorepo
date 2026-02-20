import 'reflect-metadata';
import { Arg, Query, Authorized, Ctx, Resolver } from 'type-graphql';
import { ImageUploadUrl, UserRole } from '@gatherle/commons/types';
import { getAuthenticatedUser } from '@/utils';
import { getPresignedUploadUrl, getPresignedUrl } from '@/clients/AWS/s3Client';
import { AWS_REGION, CONTENT_TYPE_MAP, S3_BUCKET_NAME } from '@/constants';
import { logger } from '@/utils/logger';
import type { ServerContext } from '@/graphql';

@Resolver()
export class ImageResolver {
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => ImageUploadUrl, { description: 'Get pre-signed URL for uploading images directly to S3' })
  async getImageUploadUrl(
    @Arg('folder', () => String, { description: 'S3 folder path (e.g., organizations/logos, users/avatars)' })
    folder: string,
    @Arg('filename', () => String, { description: 'File name with extension (e.g., tech-summit-2026.jpg)' })
    filename: string,
    @Ctx() context: ServerContext,
  ): Promise<ImageUploadUrl> {
    const user = getAuthenticatedUser(context);
    const key = `${folder}/${filename}`;

    const fileExtension = filename.split('.').pop()?.toLowerCase() || 'jpg';

    const contentType = CONTENT_TYPE_MAP[fileExtension] || 'image/jpeg';

    const uploadUrl = await getPresignedUploadUrl(key, contentType, 900); // 15 minutes
    const publicUrl = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
    const readUrl = await getPresignedUrl(key);

    logger.info('Generated image upload URL', { userId: user.userId, folder, filename, key });

    return { uploadUrl, key, publicUrl, readUrl };
  }
}
