import mongoose from 'mongoose';

export const validateMongodbId = (id: string, message?: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return true;
  }
  return true;
};
