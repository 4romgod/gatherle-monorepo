import 'reflect-metadata';
import { Field, ObjectType, registerEnumType } from 'type-graphql';

export enum MediaEntityType {
  User = 'user',
  Organization = 'organization',
  Event = 'event',
  Venue = 'venue',
  EventMoment = 'event-moment',
}

export enum MediaType {
  Avatar = 'avatar',
  Logo = 'logo',
  Featured = 'featured',
  Gallery = 'gallery',
  MomentMedia = 'moment-media',
}

registerEnumType(MediaEntityType, {
  name: 'MediaEntityType',
  description: 'The type of entity a media file belongs to',
});

registerEnumType(MediaType, {
  name: 'MediaType',
  description: 'The purpose or slot of the media file within the entity',
});

@ObjectType('MediaUploadUrl', { description: 'Pre-signed URL for uploading media directly to S3' })
export class MediaUploadUrl {
  @Field(() => String, { description: 'Pre-signed URL for uploading' })
  uploadUrl: string;

  @Field(() => String, { description: 'S3 key/path where the file will be stored' })
  key: string;

  @Field(() => String, {
    description:
      'Canonical CDN-backed media URL for the uploaded file. Persist this value and use it to display the media.',
  })
  readUrl: string;

  @Field(() => String, {
    nullable: true,
    description: 'Reserved event moment id for video uploads; null for ordinary media and image moment uploads',
  })
  momentId?: string;
}
