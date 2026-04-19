import 'reflect-metadata';
import { Arg, Mutation, Query, Authorized, Ctx, Resolver } from 'type-graphql';
import { MediaUploadUrl, MediaEntityType, MediaType, UserRole } from '@gatherle/commons/types';
import { getAuthenticatedUser } from '@/utils';
import { RESOLVER_DESCRIPTIONS } from '@/constants';
import type { ServerContext } from '@/graphql';
import { MediaService } from '@/services';

@Resolver()
export class MediaResolver {
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => MediaUploadUrl, { description: RESOLVER_DESCRIPTIONS.MEDIA.getMediaUploadUrl })
  async getMediaUploadUrl(
    @Arg('entityType', () => MediaEntityType, { description: 'Type of entity this media belongs to' })
    entityType: MediaEntityType,
    @Arg('mediaType', () => MediaType, { description: 'Purpose of the media (avatar, logo, featured, gallery)' })
    mediaType: MediaType,
    @Arg('extension', () => String, { description: 'File extension without leading dot (e.g. jpg, png, webp)' })
    extension: string,
    @Arg('entityId', () => String, {
      nullable: true,
      description: 'ID of the entity. Required for Organization, Event, Venue. Auto-resolved from auth for User.',
    })
    entityId: string | null,
    @Ctx() context: ServerContext,
  ): Promise<MediaUploadUrl> {
    const user = getAuthenticatedUser(context);
    return MediaService.getMediaUploadUrl({ entityType, mediaType, extension, entityId, userId: user.userId });
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => MediaUploadUrl, { description: RESOLVER_DESCRIPTIONS.MEDIA.getEventMomentUploadUrl })
  async getEventMomentUploadUrl(
    @Arg('eventId', () => String, { description: 'ID of the event this moment belongs to' })
    eventId: string,
    @Arg('extension', () => String, { description: 'File extension without leading dot (e.g. mp4, jpg, webp)' })
    extension: string,
    @Ctx() context: ServerContext,
  ): Promise<MediaUploadUrl> {
    const user = getAuthenticatedUser(context);
    return MediaService.getEventMomentUploadUrl({ eventId, extension, userId: user.userId, username: user.username });
  }
}
