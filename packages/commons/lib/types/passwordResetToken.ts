import 'reflect-metadata';
import { ObjectType, Field } from 'type-graphql';
import { modelOptions, prop } from '@typegoose/typegoose';

@ObjectType('PasswordResetToken')
@modelOptions({ schemaOptions: { timestamps: true } })
export class PasswordResetToken {
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
