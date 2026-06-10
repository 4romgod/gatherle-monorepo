import 'reflect-metadata';
import { getModelForClass, index, modelOptions, prop } from '@typegoose/typegoose';
import type { MongoModelForClass } from './modelTypes';

@index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
@index({ scopeKey: 1 }, { unique: true })
@modelOptions({ schemaOptions: { timestamps: true } })
class MobileDeviceAccessRegistrationThrottleModel {
  @prop({ required: true, type: () => String })
  scopeKey!: string;

  @prop({ required: true, default: 0, type: () => Number })
  attemptCount!: number;

  @prop({ required: true, type: () => Date })
  windowStartedAt!: Date;

  @prop({ required: true, type: () => Date })
  expiresAt!: Date;
}

const MobileDeviceAccessRegistrationThrottle: MongoModelForClass<typeof MobileDeviceAccessRegistrationThrottleModel> =
  getModelForClass(MobileDeviceAccessRegistrationThrottleModel, {
    options: { customName: 'MobileDeviceAccessRegistrationThrottle' },
  });

export default MobileDeviceAccessRegistrationThrottle;
