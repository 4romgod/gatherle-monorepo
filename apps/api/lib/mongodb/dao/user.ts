import {IUser, ICreateUser, UserQueryParams, IUpdateUser} from '../../interface';
import {User} from '../models';
import {ResourceNotFoundException, mongodbErrorHandler} from '../../utils';
import {v4 as uuidv4} from 'uuid';

class UserDAO {
    static async create(userData: ICreateUser): Promise<IUser> {
        try {
            const encryptedPassword = `${userData.password}-encrypted`;
            return await User.create({
                ...userData,
                encrypted_password: encryptedPassword,
                userID: uuidv4(),
            });
        } catch (error) {
            console.log(error);
            throw mongodbErrorHandler(error);
        }
    }

    static async readUserById(id: string, projections?: Array<string>): Promise<IUser> {
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

    static async readUsers(queryParams?: UserQueryParams, projections?: Array<string>): Promise<Array<IUser>> {
        const query = User.find({...queryParams});

        if (queryParams?.userIDList && queryParams.userIDList.length > 0) {
            query.where('userID').in(queryParams.userIDList);
        }

        if (projections && projections.length) {
            query.select(projections.join(' '));
        }

        return await query.exec();
    }

    static async updateUser(id: string, userData: IUpdateUser) {
        const updatedUser = await User.findByIdAndUpdate(id, {...userData}, {new: true}).exec();
        if (!updatedUser) {
            throw ResourceNotFoundException('User not found');
        }
        return updatedUser;
    }

    static async deleteUser(id: string): Promise<IUser> {
        const deletedUser = await User.findByIdAndDelete(id).exec();
        if (!deletedUser) {
            throw ResourceNotFoundException('User not found');
        }
        return deletedUser;
    }
}

export default UserDAO;
