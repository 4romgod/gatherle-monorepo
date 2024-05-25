import 'reflect-metadata';
import {ObjectType, InputType, Field, registerEnumType} from 'type-graphql';

export enum Gender {
    Male = 'Male',
    Female = 'Female',
    Other = 'Other',
}

export enum UserRole {
    Admin = 'Admin',
    User = 'User',
    Host = 'Host',
}

registerEnumType(Gender, {
    name: 'Gender',
});

registerEnumType(UserRole, {
    name: 'UserRole',
});

@ObjectType()
export class UserType {
    @Field()
    id: string;

    @Field()
    email: string;

    @Field()
    username: string;

    @Field()
    address: string;

    @Field()
    birthdate: string;

    @Field()
    given_name: string;

    @Field()
    family_name: string;

    @Field(() => Gender)
    gender?: Gender;

    @Field()
    encrypted_password: string;

    @Field({nullable: true})
    phone_number?: string;

    @Field({nullable: true})
    profile_picture?: string;

    @Field(() => UserRole)
    userType: UserRole;

    @Field({nullable: true})
    token?: string;
}

@InputType()
export class CreateUserInputType {
    @Field()
    email: string;

    @Field({nullable: true})
    username?: string;

    @Field()
    address: string;

    @Field()
    birthdate: string;

    @Field()
    given_name: string;

    @Field()
    family_name: string;

    @Field(() => Gender)
    gender?: Gender;

    @Field()
    password: string;

    @Field({nullable: true})
    phone_number?: string;

    @Field({nullable: true})
    profile_picture?: string;
}

@InputType()
export class UpdateUserInputType {
    @Field()
    id: string;

    @Field()
    email: string;

    @Field({nullable: true})
    username?: string;

    @Field()
    address: string;

    @Field()
    birthdate: string;

    @Field()
    given_name: string;

    @Field()
    family_name: string;

    @Field(() => Gender)
    gender: Gender;

    @Field()
    password: string;

    @Field({nullable: true})
    phone_number?: string;

    @Field({nullable: true})
    profile_picture?: string;
}

@InputType()
export class LoginUserInputType {
    @Field()
    email: string;

    @Field()
    password: string;
}

export type JwtUserPayload = Omit<UserType, 'id'>;

export type UserQueryParams = Partial<Record<keyof UserType, any>> & {userIDList?: Array<string>};
