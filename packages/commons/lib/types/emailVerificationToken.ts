import 'reflect-metadata';
import { Field, InputType, ObjectType } from 'type-graphql';
import { modelOptions, prop } from '@typegoose/typegoose';

@ObjectType('EmailVerificationToken')
@modelOptions({ schemaOptions: { timestamps: true } })
export class EmailVerificationToken {
  @prop({ required: true, index: true, type: () => String })
  @Field(() => String)
  userId: string;

  /** Stored as a bcrypt hash — never exposed via GraphQL */
  @prop({ required: true, type: () => String })
  tokenHash: string;

  @prop({ required: true, type: () => Date })
  @Field(() => Date)
  expiresAt: Date;
}

@InputType('RequestEmailVerificationInput')
export class RequestEmailVerificationInput {
  @Field(() => String, { description: 'Email address of the account to verify' })
  email: string;
}

@InputType('VerifyEmailInput')
export class VerifyEmailInput {
  @Field(() => String, { description: 'The email verification token sent to the user' })
  token: string;
}
