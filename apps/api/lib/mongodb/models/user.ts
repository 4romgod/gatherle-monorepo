import {UserType} from '../../graphql/types';
import {model, Schema, Document} from 'mongoose';

const UserSchema = new Schema<UserType & Document>(
    {
        email: {type: String, required: true, unique: true},
        username: {type: String, required: true, unique: true},
        address: {type: String, required: true},
        birthdate: {type: String, required: true},
        given_name: {type: String, required: true},
        family_name: {type: String, required: true},
        gender: {type: String, required: true},
        encrypted_password: {type: String, required: true},
        phone_number: {type: String, required: false},
        profile_picture: {type: String, required: false},
        userType: {type: String, required: true},
    },
    {timestamps: true},
);

const User = model<UserType & Document>('User', UserSchema);

export default User;
