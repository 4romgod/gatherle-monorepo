import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { Intent as IntentEntity } from '@gatherle/commons/types';

@pre<IntentModel>('validate', function (next) {
  try {
    if (!this.intentId && this._id) {
      this.intentId = this._id.toString();
    }
    next();
  } catch (error) {
    next(error as Error);
  }
})
class IntentModel extends IntentEntity {}

const Intent = getModelForClass(IntentModel, {
  options: { customName: 'Intent' },
});

export default Intent;
