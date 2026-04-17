import 'reflect-metadata';
import { Arg, Query, Authorized, Ctx, Resolver } from 'type-graphql';
import { ImageUploadUrl, ImageEntityType, ImageType, UserRole } from '@gatherle/commons/types';
import { getAuthenticatedUser } from '@/utils';
import { getPresignedUploadUrl } from '@/clients/AWS/s3Client';
import { CF_IMAGES_DOMAIN, CONTENT_TYPE_MAP, STAGE } from '@/constants';
import { logger } from '@/utils/logger';
import type { ServerContext } from '@/graphql';
import { randomUUID } from 'crypto';

@Resolver()
export class ImageResolver {
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => ImageUploadUrl, { description: 'Get pre-signed URL for uploading images directly to S3' })
  async getImageUploadUrl(
    @Arg('entityType', () => ImageEntityType, { description: 'Type of entity this image belongs to' })
    entityType: ImageEntityType,
    @Arg('imageType', () => ImageType, { description: 'Purpose of the image (avatar, logo, featured, gallery)' })
    imageType: ImageType,
    @Arg('extension', () => String, { description: 'File extension without leading dot (e.g. jpg, png, webp)' })
    extension: string,
    @Arg('entityId', () => String, {
      nullable: true,
      description: 'ID of the entity. Required for Organization, Event, Venue. Auto-resolved from auth for User.',
    })
    entityId: string | null,
    @Ctx() context: ServerContext,
  ): Promise<ImageUploadUrl> {
    const user = getAuthenticatedUser(context);

    // For User images, always derive the entity ID from the authenticated user — never trust the client.
    // For other entity types, fall back to a random UUID if no entityId is provided (e.g. during entity creation
    // before an ID has been assigned). This keeps the key non-colliding even without a real entity ID.
    const resolvedEntityId = entityType === ImageEntityType.User ? user.userId : (entityId ?? randomUUID());

    const cleanExt = extension.toLowerCase().replace(/^\./, '');
    const contentType = CONTENT_TYPE_MAP[cleanExt] || 'image/jpeg';
    // Gallery images get a unique key per upload; all other types (avatar, logo, featured)
    // use a deterministic key so re-uploading overwrites the same S3 object.
    const filename =
      imageType === ImageType.Gallery ? `${imageType}-${randomUUID()}.${cleanExt}` : `${imageType}.${cleanExt}`;

    // Key structure: {stage}/{entityType}s/{entityId}/{filename}
    // e.g. beta/users/abc123/avatar.jpg (avatar/logo/featured)
    //      beta/users/abc123/gallery-<uuid>.jpg (gallery)
    const stagePrefix = STAGE.toLowerCase();
    const entityFolder = `${entityType}s`;
    const key = `${stagePrefix}/${entityFolder}/${resolvedEntityId}/${filename}`;

    if (!CF_IMAGES_DOMAIN) {
      throw new Error('CF_IMAGES_DOMAIN is required to generate stable media URLs');
    }

    const uploadUrl = await getPresignedUploadUrl(key, contentType, 900); // 15 minutes
    const readUrl = `https://${CF_IMAGES_DOMAIN}/${key}`;

    logger.info('Generated image upload URL', {
      userId: user.userId,
      entityType,
      entityId: resolvedEntityId,
      imageType,
      key,
      mediaHost: CF_IMAGES_DOMAIN,
    });

    return { uploadUrl, key, readUrl };
  }
}
