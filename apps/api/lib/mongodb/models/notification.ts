import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { Notification as NotificationEntity } from '@gatherle/commons/types';
import type { MongoModelForClass } from './modelTypes';

@pre<NotificationModel>('validate', function () {
  if (!this.notificationId && this._id) {
    this.notificationId = this._id.toString();
  }
})
class NotificationModel extends NotificationEntity {}

const Notification: MongoModelForClass<typeof NotificationModel> = getModelForClass(NotificationModel, {
  options: { customName: 'Notification' },
});

export default Notification;
