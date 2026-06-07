import 'reflect-metadata';
import { Field, ID, InputType, ObjectType, registerEnumType } from 'type-graphql';
import { index, modelOptions, prop, Severity } from '@typegoose/typegoose';

export enum PushSubscriptionProvider {
  Expo = 'Expo',
  Fcm = 'Fcm',
}

export enum PushSubscriptionPlatform {
  Android = 'Android',
  Ios = 'Ios',
  Web = 'Web',
}

registerEnumType(PushSubscriptionProvider, {
  name: 'PushSubscriptionProvider',
  description: 'Push delivery provider used to route notifications to a device.',
});

registerEnumType(PushSubscriptionPlatform, {
  name: 'PushSubscriptionPlatform',
  description: 'Client platform that registered the push subscription.',
});

@ObjectType('PushSubscription', {
  description: 'A device-level push subscription registered for authenticated notification delivery.',
})
@modelOptions({ schemaOptions: { timestamps: true }, options: { allowMixed: Severity.ALLOW } })
@index({ token: 1 }, { unique: true })
@index({ userId: 1, isActive: 1 })
export class PushSubscription {
  @prop({ required: true, index: true, type: () => String })
  @Field(() => ID, { description: 'Unique identifier for this push subscription.' })
  pushSubscriptionId: string;

  @prop({ required: true, index: true, type: () => String })
  @Field(() => ID, { description: 'Authenticated user who owns this subscription.' })
  userId: string;

  @prop({ required: true, enum: PushSubscriptionProvider, type: () => String })
  @Field(() => PushSubscriptionProvider, { description: 'Push provider used for this subscription.' })
  provider: PushSubscriptionProvider;

  @prop({ required: true, enum: PushSubscriptionPlatform, type: () => String })
  @Field(() => PushSubscriptionPlatform, { description: 'Platform that registered this subscription.' })
  platform: PushSubscriptionPlatform;

  @prop({ required: true, type: () => String })
  @Field(() => String, { description: 'Provider-issued token used to send notifications to this device.' })
  token: string;

  @prop({ required: true, index: true, type: () => String })
  @Field(() => String, { description: 'Stable app-install identifier used to track this device registration.' })
  deviceInstallationId: string;

  @prop({ default: true, type: () => Boolean })
  @Field(() => Boolean, { description: 'Whether this push subscription is currently active.' })
  isActive: boolean;

  @prop({ type: () => Date, default: () => new Date() })
  @Field(() => Date, { description: 'When this subscription was last refreshed by the client.' })
  lastRegisteredAt: Date;

  @prop({ type: () => Date })
  @Field(() => Date, { nullable: true, description: 'When a push was last delivered successfully.' })
  lastDeliveredAt?: Date;

  @Field(() => Date, { description: 'When this push subscription was created.' })
  createdAt: Date;

  @Field(() => Date, { description: 'When this push subscription was last updated.' })
  updatedAt?: Date;
}

@InputType('RegisterPushSubscriptionInput', {
  description: 'Input required to register or refresh a device push subscription.',
})
export class RegisterPushSubscriptionInput {
  @Field(() => PushSubscriptionProvider, {
    nullable: true,
    description: 'Optional provider override. When omitted, the API infers the provider from the token and platform.',
  })
  provider?: PushSubscriptionProvider;

  @Field(() => PushSubscriptionPlatform, { description: 'Platform that owns the push token.' })
  platform: PushSubscriptionPlatform;

  @Field(() => String, { description: 'Provider-issued push token to register for the current user.' })
  token: string;

  @Field(() => String, { description: 'Stable app-install identifier used to deduplicate registrations.' })
  deviceInstallationId: string;
}
