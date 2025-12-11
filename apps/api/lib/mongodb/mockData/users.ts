import {CreateUserInput} from '@ntlango/commons/types';
import {Gender} from '@ntlango/commons/types/user';

const users: CreateUserInput[] = [
  {
    // id: 'user001',
    email: 'user001@gmail.com',
    username: 'jackBaur',
    address: {
      country: 'South Africa',
      state: 'KZN',
      city: 'Durban',
      zipCode: '8000',
    },
    interests: [],
    birthdate: '1994-06-26',
    family_name: 'Baur',
    gender: Gender.Male,
    given_name: 'Jack',
    password: 'dfuyihjknbsndhj',
    phone_number: '+12345678990',
    profile_picture: '',
    bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
  },
  {
    // id: 'host001',
    email: 'jay@rocknation.com',
    username: 'jayz',
    address: {
      country: 'South Africa',
      state: 'Gauteng',
      city: 'Centurion',
      zipCode: '0600',
    },
    interests: [],
    birthdate: '1990-01-21',
    family_name: 'Carter',
    gender: Gender.Male,
    given_name: 'Sean',
    password: 'tryuik',
    phone_number: '+12345678990',
    profile_picture: '',
    bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
  },
  {
    // id: 'user002',
    email: 'celin@yahoo.com',
    username: 'celin352',
    address: {
      country: 'South Africa',
      state: 'Western Cape',
      city: 'Parklands',
      zipCode: '0901',
    },
    interests: [],
    birthdate: '1999-06-25',
    family_name: 'Maluleke',
    gender: Gender.Female,
    given_name: 'Celin',
    password: 'wreiujk22',
    phone_number: '+12345678990',
    profile_picture: '',
    bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
  },
  {
    // id: 'host002',
    email: 'Jeff@amazon.com',
    username: 'jeffbez',
    address: {
      country: 'South Africa',
      state: 'Limpopo',
      city: 'Polokwane',
      zipCode: '0800',
    },
    interests: [],
    birthdate: '1997-07-05',
    family_name: 'Bezos',
    gender: Gender.Male,
    given_name: 'Jeff',
    password: '123456789',
    phone_number: '+12345678990',
    profile_picture: '',
    bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
  },
];

export default users;
