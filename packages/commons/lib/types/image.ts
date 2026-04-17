import 'reflect-metadata';
import { Field, ObjectType, registerEnumType } from 'type-graphql';

export enum ImageEntityType {
  User = 'user',
  Organization = 'organization',
  Event = 'event',
  Venue = 'venue',
}

export enum ImageType {
  Avatar = 'avatar',
  Logo = 'logo',
  Featured = 'featured',
  Gallery = 'gallery',
}

registerEnumType(ImageEntityType, {
  name: 'ImageEntityType',
  description: 'The type of entity an image belongs to',
});

registerEnumType(ImageType, {
  name: 'ImageType',
  description: 'The purpose or slot of the image within the entity',
});

@ObjectType('ImageUploadUrl', { description: 'Pre-signed URL for uploading images directly to S3' })
export class ImageUploadUrl {
  @Field(() => String, { description: 'Pre-signed URL for uploading' })
  uploadUrl: string;

  @Field(() => String, { description: 'S3 key/path where the file will be stored' })
  key: string;

  @Field(() => String, {
    description:
      'Canonical CDN-backed media URL for the uploaded file. Persist this value and use it to display the image.',
  })
  readUrl: string;
}
