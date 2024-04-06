export enum Gender {
    MALE = 'Male',
    FEMALE = 'Female',
    OTHER = 'Other',
}

export enum UserType {
    ADMIN = 'Admin',
    USER = 'User',
    HOST = 'Host',
}

export type IUser = {
    id?: string;
    /**
     * Represents the user\'s email address.
     * @type {string}
     */
    email: string;
    /**
     * Represents the user's username.
     * @type {string}
     */
    username: string;
    /**
     * The user's physical address.
     * @type {string}
     */
    address: string;
    /**
     * Represents the user\'s birthdate.
     * @type {string}
     */
    birthdate: string;
    /**
     * Represents the user's given name (first name).
     * @type {string}
     */
    given_name: string;
    /**
     * Represents the user's family name (last name).
     * @type {string}
     */
    family_name: string;
    /**
     * Represents the user's gender.
     * @type {string}
     */
    gender: Gender;
    /**
     * The password chosen by the user during registration. Passwords should meet the following criteria: - Minimum length: 6 characters - At least one uppercase letter - At least one lowercase letter - At least one digit - Special characters allowed but not required.
     * @type {string}
     */
    encrypted_password: string;
    /**
     * Represents the user's phone number.
     * @type {string}
     */
    phone_number?: string;
    /**
     * Link to the user's profile photo
     * @type {string}
     */
    profile_picture?: string;
    /**
     * User authZ level
     * @type {string}
     */
    userType: UserType;
    /**
     * Timestamp for when a document is created
     * @type {string}
     */
    createdAt?: string;
    /**
     * Timestamp for when a document is last updated
     * @type {string}
     */
    updatedAt?: string;
};

export type ICreateUser = Omit<IUser, 'encrypted_password'> & {password: string};

export type IUpdateUser = Omit<IUser, 'encrypted_password'> & {password: string};

export type UserQueryParams = Partial<Record<keyof IUser, any>> & {userIDList?: Array<string>};
