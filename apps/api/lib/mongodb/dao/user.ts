import {User} from '../models';
import {UserType, UpdateUserInputType, CreateUserInputType, UserQueryParams} from '../../graphql/types';
import {ResourceNotFoundException, mongodbErrorHandler} from '../../utils';

class UserDAO {
    static async create(userData: CreateUserInputType): Promise<UserType> {
        try {
            const encryptedPassword = `${userData.password}-encrypted`;
            return await User.create({
                ...userData,
                encrypted_password: encryptedPassword,
            });
        } catch (error) {
            console.log(error);
            throw mongodbErrorHandler(error);
        }
    }

    static async readUserById(id: string, projections?: Array<string>): Promise<UserType> {
        const query = User.findById(id);
        if (projections && projections.length) {
            query.select(projections.join(' '));
        }
        const user = await query.exec();

        if (!user) {
            throw ResourceNotFoundException('User not found');
        }
        return user;
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
