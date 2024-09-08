import {Gender, UserRole, UserTypeDocument} from '@/graphql/types';
import {model, Schema, CallbackWithoutResultAndOptionalError, CallbackError} from 'mongoose';
import {hash, genSalt, compare} from 'bcryptjs';

export const UserSchema = new Schema<UserTypeDocument>(
  {
    address: {
      type: String,
      required: true,
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
    userRole: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.User,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

UserSchema.pre('validate', async function (next: CallbackWithoutResultAndOptionalError) {
  try {
    this.userId = this._id!.toString();

    if (this.email && !this.username) {
      let baseUsername = this.email.split('@')[0];
      let usernameSuffix = 1;
      let newUsername = baseUsername;

      while (true) {
        const existingUser = await User.findOne({username: newUsername});
        if (!existingUser) break;
        newUsername = baseUsername + usernameSuffix;
        usernameSuffix++;
      }

      this.username = newUsername;
    }

    if (this.isModified('password')) {
      const salt = await genSalt(10);
      this.password = await hash(this.password, salt);
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
