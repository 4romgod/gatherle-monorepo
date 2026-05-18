import { useMutation } from '@apollo/client';
import { EventMomentType } from '@data/graphql/types/graphql';
import type { ImagePickerAsset } from 'expo-image-picker';
import { CreateEventMomentDocument, DeleteEventMomentDocument } from '@data/graphql/mutation/EventMoment/mutation';
import { GetEventMomentUploadUrlDocument } from '@data/graphql/mutation/Media/mutation';
import { getApolloAuthContext } from '@/lib/auth';
import { getMomentAssetExtension, uploadMomentAssetToSignedUrl } from '@/lib/moments/upload';
import { MOMENT_DEFAULT_BACKGROUND, MOMENT_MAX_CAPTION_LENGTH } from '@/lib/moments/constants';

type CreateMomentArgs =
  | {
      background?: string;
      caption: string;
      eventId: string;
      occurrenceId?: string;
      type: 'text';
    }
  | {
      asset: ImagePickerAsset;
      caption?: string;
      eventId: string;
      occurrenceId?: string;
      type: 'image';
    }
  | {
      asset: ImagePickerAsset;
      caption?: string;
      eventId: string;
      occurrenceId?: string;
      thumbnailAsset?: ImagePickerAsset;
      type: 'video';
    };

export function useCreateEventMoment(authToken: string | null) {
  const [createMomentMutation, createState] = useMutation(CreateEventMomentDocument, getApolloAuthContext(authToken));
  const [getUploadUrlMutation, uploadState] = useMutation(
    GetEventMomentUploadUrlDocument,
    getApolloAuthContext(authToken),
  );
  const [deleteMomentMutation] = useMutation(DeleteEventMomentDocument, getApolloAuthContext(authToken));

  const createMoment = async (args: CreateMomentArgs) => {
    if (!authToken) {
      throw new Error('You need to be logged in to post a moment.');
    }

    if (args.type === 'text') {
      const caption = args.caption.trim().slice(0, MOMENT_MAX_CAPTION_LENGTH);
      if (!caption) {
        throw new Error('Caption is required for a text moment.');
      }

      const result = await createMomentMutation({
        variables: {
          input: {
            background: args.background ?? MOMENT_DEFAULT_BACKGROUND,
            caption,
            eventId: args.eventId,
            occurrenceId: args.occurrenceId,
            type: EventMomentType.Text,
          },
        },
      });

      return result.data?.createEventMoment ?? null;
    }

    const extension = getMomentAssetExtension(args.asset);
    const uploadUrlResult = await getUploadUrlMutation({
      variables: {
        eventId: args.eventId,
        occurrenceId: args.occurrenceId,
        extension,
      },
    });

    const uploadTarget = uploadUrlResult.data?.getEventMomentUploadUrl;
    if (!uploadTarget) {
      throw new Error('We could not prepare this media upload.');
    }

    if (args.type === 'video' && !uploadTarget.momentId) {
      throw new Error('We could not reserve this video moment.');
    }

    const reservedMomentId = args.type === 'video' ? uploadTarget.momentId : undefined;

    try {
      await uploadMomentAssetToSignedUrl(uploadTarget.uploadUrl, args.asset);
    } catch (err) {
      if (reservedMomentId) {
        await deleteMomentMutation({ variables: { momentId: reservedMomentId } }).catch(() => undefined);
      }
      throw err;
    }

    let thumbnailKey: string | undefined;

    if (args.type === 'video' && args.thumbnailAsset) {
      const thumbnailUploadUrlResult = await getUploadUrlMutation({
        variables: {
          eventId: args.eventId,
          occurrenceId: args.occurrenceId,
          extension: getMomentAssetExtension(args.thumbnailAsset),
        },
      });

      const thumbnailUploadTarget = thumbnailUploadUrlResult.data?.getEventMomentUploadUrl;
      if (thumbnailUploadTarget) {
        try {
          await uploadMomentAssetToSignedUrl(thumbnailUploadTarget.uploadUrl, args.thumbnailAsset);
          thumbnailKey = thumbnailUploadTarget.key;
        } catch (err) {
          if (reservedMomentId) {
            await deleteMomentMutation({ variables: { momentId: reservedMomentId } }).catch(() => undefined);
          }
          throw err;
        }
      }
    }

    const input =
      args.type === 'video'
        ? {
            caption: args.caption?.trim().slice(0, MOMENT_MAX_CAPTION_LENGTH) || undefined,
            eventId: args.eventId,
            mediaKey: uploadTarget.key,
            momentId: uploadTarget.momentId,
            occurrenceId: args.occurrenceId,
            thumbnailKey,
            type: EventMomentType.Video,
          }
        : {
            caption: args.caption?.trim().slice(0, MOMENT_MAX_CAPTION_LENGTH) || undefined,
            eventId: args.eventId,
            mediaKey: uploadTarget.key,
            occurrenceId: args.occurrenceId,
            type: EventMomentType.Image,
          };

    let createResult;
    try {
      createResult = await createMomentMutation({
        variables: { input },
      });
    } catch (err) {
      if (reservedMomentId) {
        await deleteMomentMutation({ variables: { momentId: reservedMomentId } }).catch(() => undefined);
      }
      throw err;
    }

    return createResult.data?.createEventMoment ?? null;
  };

  return {
    createMoment,
    loading: createState.loading || uploadState.loading,
  };
}
