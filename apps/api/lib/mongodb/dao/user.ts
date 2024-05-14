import {User} from '../models';
import {UserType, UpdateUserInputType, CreateUserInputType, UserQueryParams, LoginUserInputType, JwtUserPayload} from '../../graphql/types';
import {ResourceNotFoundException, mongodbErrorHandler} from '../../utils';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {JWT_SECRET} from '../../constants';

class UserDAO {
    static async create(userData: CreateUserInputType): Promise<UserType> {
        try {
            const userProps: JwtUserPayload = {
                ...userData,
                username: userData.username ?? userData.email.split('@')[0],
                email: userData.email.toLocaleLowerCase(),
                encrypted_password: await bcrypt.hash(userData.password, 10),
            };

            const jwtToken = jwt.sign(userProps, JWT_SECRET, {expiresIn: '2h'});
            const newUser = new User({...userProps, token: jwtToken});

            return await newUser.save();
        } catch (error) {
            console.log('Error when creating a new user', error);
            throw mongodbErrorHandler(error);
        }
    }

    static async login(loginData: LoginUserInputType): Promise<UserType> {
        const user = await User.findOne({email: loginData.email});
        if (user && (await bcrypt.compare(loginData.password, user.encrypted_password))) {
            const jwtPayload: JwtUserPayload = {...user.toObject({getters: true}), token: undefined};
            const jwtToken = jwt.sign(jwtPayload, JWT_SECRET, {expiresIn: '2h'});
            user.token = jwtToken;

            console.log(user);
            return await user.save();
        }
        throw ResourceNotFoundException(`User with email ${loginData.email} does not exist`);
    }

    static async readUserById(id: string, projections?: Array<string>): Promise<UserType> {
        try {
            const query = User.findById(id);
            if (projections && projections.length) {
                query.select(projections.join(' '));
            }
            const user = await query.exec();

            if (!user) {
                throw ResourceNotFoundException('User not found');
            }
            return user;
        } catch (error) {
            console.error('Error reading user by id:', error);
            throw error;
        }
    }

    static async readUserByUsername(username: string, projections?: Array<string>): Promise<UserType> {
        try {
            const query = User.findOne({username});
            if (projections && projections.length) {
                query.select(projections.join(' '));
            }
            const user = await query.exec();

            if (!user) {
                throw ResourceNotFoundException('User not found');
            }
            return user;
        } catch (error) {
            console.error('Error reading user by id:', error);
            throw error;
        }
    }

    static async readUsers(queryParams?: UserQueryParams, projections?: Array<string>): Promise<Array<UserType>> {
        const query = User.find({...queryParams});

        if (queryParams?.userIDList && queryParams.userIDList.length > 0) {
            query.where('id').in(queryParams.userIDList);
        }

        if (projections && projections.length) {
            query.select(projections.join(' '));
        }

        return await query.exec();
    }

    static async updateUser(user: UpdateUserInputType) {
        const updatedUser = await User.findByIdAndUpdate(user.id, {...user}, {new: true}).exec();
        if (!updatedUser) {
            throw ResourceNotFoundException('User not found');
        }
        return updatedUser;
    }

    static async deleteUser(id: string): Promise<UserType> {
        const deletedUser = await User.findByIdAndDelete(id).exec();
        if (!deletedUser) {
            throw ResourceNotFoundException('User not found');
        }
        return deletedUser;
    }
}

export default UserDAO;
