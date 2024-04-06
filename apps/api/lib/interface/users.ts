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
    /**
     * MongoDB ObjectId
     * @type {string}
     */
    _id: string;
    /**
     * The unique ID of the user.
     * @type {string}
     */
    userID: string;
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
     * Represents the user's given name (first name).
     * @type {string}
     */
    given_name: string;
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
     *
     * @type {string}
     */
    profile_picture?: string;
    userType: UserType;
};
