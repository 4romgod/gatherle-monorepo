import 'reflect-metadata';
import { getModelForClass, index, modelOptions, prop } from '@typegoose/typegoose';
import type { MongoModelForClass } from './modelTypes';

@index({ connectionId: 1 }, { unique: true })
@index({ userId: 1 })
@index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
  options: {
    customName: 'WebSocketConnection',
  },
})
class WebSocketConnectionModel {
  @prop({ type: () => String, required: true, trim: true })
  connectionId!: string;

  @prop({ type: () => String, required: true, trim: true })
  userId!: string;

  @prop({ type: () => String, trim: true })
  deviceInstallationId?: string;

  @prop({ type: () => String, required: true, trim: true })
  domainName!: string;

  @prop({ type: () => String, required: true, trim: true })
  stage!: string;

  @prop({ type: () => Date, required: true })
  connectedAt!: Date;

  @prop({ type: () => Date, required: true })
  lastSeenAt!: Date;

  @prop({ type: () => Date })
  expiresAt?: Date;
}

const WebSocketConnection: MongoModelForClass<typeof WebSocketConnectionModel> =
  getModelForClass(WebSocketConnectionModel);

export type WebSocketConnectionEntity = WebSocketConnectionModel;
export default WebSocketConnection;
