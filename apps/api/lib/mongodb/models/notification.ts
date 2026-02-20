import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { Notification as NotificationEntity } from '@gatherle/commons/types';

@pre<NotificationModel>('validate', function (next) {
  try {
    if (!this.notificationId && this._id) {
      this.notificationId = this._id.toString();
    }
    next();
  } catch (error) {
    next(error as Error);
  }
})
class NotificationModel extends NotificationEntity {}

const Notification = getModelForClass(NotificationModel, {
  options: { customName: 'Notification' },
});

export default Notification;
