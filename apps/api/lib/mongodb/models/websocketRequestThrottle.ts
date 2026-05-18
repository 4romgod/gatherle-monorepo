import 'reflect-metadata';
import { getModelForClass, index, modelOptions, prop } from '@typegoose/typegoose';

@index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
@index({ scopeKey: 1 }, { unique: true })
@modelOptions({ schemaOptions: { timestamps: true } })
class WebSocketRequestThrottleModel {
  @prop({ required: true, type: () => String })
  scopeKey!: string;

  @prop({ required: true, type: () => String })
  routeKey!: string;

  @prop({ required: true, default: 0, type: () => Number })
  attemptCount!: number;

  @prop({ required: true, type: () => Date })
  windowStartedAt!: Date;

  @prop({ required: true, type: () => Date })
  expiresAt!: Date;
}

export default getModelForClass(WebSocketRequestThrottleModel);
