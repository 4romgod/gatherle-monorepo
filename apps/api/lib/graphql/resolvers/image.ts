import 'reflect-metadata';
import { Arg, Mutation, Query, Authorized, Ctx, Resolver } from 'type-graphql';
import { ImageUploadUrl, ImageEntityType, ImageType, UserRole } from '@gatherle/commons/types';
import { getAuthenticatedUser } from '@/utils';
import { RESOLVER_DESCRIPTIONS } from '@/constants';
import type { ServerContext } from '@/graphql';
import { ImageService } from '@/services';

@Resolver()
export class ImageResolver {
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => ImageUploadUrl, { description: RESOLVER_DESCRIPTIONS.IMAGE.getImageUploadUrl })
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
    return ImageService.getImageUploadUrl({ entityType, imageType, extension, entityId, userId: user.userId });
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => ImageUploadUrl, { description: RESOLVER_DESCRIPTIONS.IMAGE.getEventMomentUploadUrl })
  async getEventMomentUploadUrl(
    @Arg('eventId', () => String, { description: 'ID of the event this moment belongs to' })
    eventId: string,
    @Arg('extension', () => String, { description: 'File extension without leading dot (e.g. mp4, jpg, webp)' })
    extension: string,
    @Ctx() context: ServerContext,
  ): Promise<ImageUploadUrl> {
    const user = getAuthenticatedUser(context);
    return ImageService.getEventMomentUploadUrl({ eventId, extension, userId: user.userId, username: user.username });
  }
}
