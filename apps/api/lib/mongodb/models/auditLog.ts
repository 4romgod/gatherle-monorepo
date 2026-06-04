import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { AuditLog as AuditLogEntity } from '@gatherle/commons/server/types';
import type { MongoModelForClass } from './modelTypes';

@pre<AuditLogModel>('validate', function () {
  if (!this.auditId && this._id) {
    this.auditId = this._id.toString();
  }
})
class AuditLogModel extends AuditLogEntity {}

const AuditLog: MongoModelForClass<typeof AuditLogModel> = getModelForClass(AuditLogModel, {
  options: { customName: 'AuditLog' },
});

export default AuditLog;
