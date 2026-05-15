import { useMutation } from '@apollo/client';
import { EventMomentType } from '@data/graphql/types/graphql';
import type { ImagePickerAsset } from 'expo-image-picker';
import { CreateEventMomentDocument } from '@data/graphql/mutation/EventMoment/mutation';
import { GetEventMomentUploadUrlDocument } from '@data/graphql/query/Media/query';
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
    };

export function useCreateEventMoment(authToken: string | null) {
  const [createMomentMutation, createState] = useMutation(CreateEventMomentDocument, getApolloAuthContext(authToken));
  const [getUploadUrlMutation, uploadState] = useMutation(
    GetEventMomentUploadUrlDocument,
    getApolloAuthContext(authToken),
  );

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
      throw new Error('We could not prepare this image upload.');
    }

    await uploadMomentAssetToSignedUrl(uploadTarget.uploadUrl, args.asset);

    const createResult = await createMomentMutation({
      variables: {
        input: {
          caption: args.caption?.trim().slice(0, MOMENT_MAX_CAPTION_LENGTH) || undefined,
          eventId: args.eventId,
          mediaKey: uploadTarget.key,
          occurrenceId: args.occurrenceId,
          type: EventMomentType.Image,
        },
      },
    });

    return createResult.data?.createEventMoment ?? null;
  };

  return {
    createMoment,
    loading: createState.loading || uploadState.loading,
  };
}
