import { Gender, UserRole, UserTypeDocument } from '@/graphql/types';
import { model, Schema, CallbackWithoutResultAndOptionalError, CallbackError } from 'mongoose';
import { hash, genSalt, compare } from 'bcryptjs';

// TODO Add bio attribute
export const UserSchema = new Schema<UserTypeDocument>(
  {
    address: {
      type: Schema.Types.Mixed,
      default: {},
      required: false,
    },
    birthdate: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    family_name: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: Object.values(Gender),
      required: false,
    },
    given_name: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    phone_number: {
      type: String,
      required: false,
    },
    profile_picture: {
      type: String,
      required: false,
    },
    userId: {
      type: String,
      required: true,
      unique: true,
      indexes: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    bio: {
      type: String,
      required: false,
      unique: false,
    },
    userRole: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.User,
      required: true,
    },
    interests: [
      {
        type: Schema.Types.ObjectId,
        ref: 'EventCategory',
        required: false,
        index: true,
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Helper for password hashing
async function hashPassword(plainPassword: string): Promise<string> {
  const salt = await genSalt(10);
  return hash(plainPassword, salt);
}

UserSchema.pre('validate', async function (next: CallbackWithoutResultAndOptionalError) {
  try {
    this.userId = this._id!.toString();

    if (this.email && !this.username) {
      let baseUsername = this.email.split('@')[0];
      let usernameSuffix = 1;
      let newUsername = baseUsername;

      while (true) {
        const existingUser = await User.findOne({ username: newUsername });
        if (!existingUser) break;
        newUsername = baseUsername + usernameSuffix;
        usernameSuffix++;
      }

      this.username = newUsername;
    }

    if (this.isModified('password')) {
      this.password = await hashPassword(this.password);
    }

    if (this.isModified('email')) {
      this.email = this.email.toLowerCase();
    }

    next();
  } catch (err) {
    console.log('Error when pre-saving the user', err);
    next(err as CallbackError);
  }
});

// Pre-update hook (e.g. findByIdAndUpdate)
UserSchema.pre(['findOneAndUpdate', 'updateOne'], async function (next) {
  try {
    const update = this.getUpdate();

    if (!update || typeof update !== 'object' || Array.isArray(update)) {
      return next();
    }

    const updateObj = update as Record<string, any>;

    if (updateObj.password) {
      updateObj.password = await hashPassword(updateObj.password);
    }

    if (updateObj.email) {
      updateObj.email = updateObj.email.toLowerCase();
    }
    this.setUpdate(updateObj);
    next();
  } catch (err) {
    console.error('Error in pre-update hook', err);
    next(err as CallbackError);
  }
});

UserSchema.methods.comparePassword = function (candidatePassword: string) {
  return compare(candidatePassword, this.password);
};

UserSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});

UserSchema.set('toObject', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});

const User = model('User', UserSchema);

export default User;
