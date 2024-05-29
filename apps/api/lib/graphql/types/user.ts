import 'reflect-metadata';
import {ObjectType, InputType, Field, registerEnumType, Authorized} from 'type-graphql';

export enum Gender {
    Male = 'Male',
    Female = 'Female',
    Other = 'Other',
}

export enum UserRole {
    Admin = 'Admin',
    User = 'User',
    Host = 'Host',
    Guest = 'Guest',
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
    userRole: UserRole;
}

@ObjectType()
export class UserWithTokenType extends UserType {
    @Field()
    token: string;
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

    @Field(() => Gender, {nullable: true})
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

    @Field({nullable: true})
    email?: string;

    @Field({nullable: true})
    username?: string;

    @Field({nullable: true})
    address?: string;

    @Field({nullable: true})
    birthdate?: string;

    @Field({nullable: true})
    given_name?: string;

    @Field({nullable: true})
    family_name?: string;

    @Field(() => Gender, {nullable: true})
    gender?: Gender;

    @Field({nullable: true})
    password?: string;

    @Field({nullable: true})
    phone_number?: string;

    @Field({nullable: true})
    profile_picture?: string;

    @Authorized([UserRole.Admin])
    @Field(() => UserRole, {nullable: true})
    userRole?: string;
}

@InputType()
export class LoginUserInputType {
    @Field()
    email: string;

    @Field()
    password: string;
}

export type UserQueryParams = Partial<Record<keyof UserType, any>> & {userIDList?: Array<string>};
