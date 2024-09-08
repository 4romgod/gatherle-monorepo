import 'reflect-metadata';
import {EVENT_DESCRIPTIONS, LOCATION_DESCRIPTIONS} from '@/constants';
import {ObjectType, Field} from 'type-graphql';

@ObjectType('Coordinates', {description: LOCATION_DESCRIPTIONS.COORDINATES})
class Coordinates {
  @Field((type) => Number, {description: LOCATION_DESCRIPTIONS.LATITUDE})
  latitude: number;

  @Field((type) => Number, {description: LOCATION_DESCRIPTIONS.LONGITUDE})
  longitude: number;
}

@ObjectType('Address', {description: LOCATION_DESCRIPTIONS.ADDRESS})
class Address {
  @Field((type) => String, {description: LOCATION_DESCRIPTIONS.STREET})
  street: string;

  @Field((type) => String, {description: LOCATION_DESCRIPTIONS.CITY})
  city: string;

  @Field((type) => String, {description: LOCATION_DESCRIPTIONS.STATE})
  state: string;

  @Field((type) => String, {description: LOCATION_DESCRIPTIONS.ZIP_CODE})
  zipCode: string;

  @Field((type) => String, {description: LOCATION_DESCRIPTIONS.COUNTRY})
  country: string;
}

@ObjectType('Location', {description: EVENT_DESCRIPTIONS.EVENT.LOCATION})
export class Location {
  @Field((type) => String, {description: LOCATION_DESCRIPTIONS.LOCATION_TYPE})
  locationType: 'venue' | 'online' | 'tba';

  @Field(() => Coordinates, {nullable: true, description: LOCATION_DESCRIPTIONS.COORDINATES})
  coordinates?: Coordinates;

  @Field(() => Address, {nullable: true, description: LOCATION_DESCRIPTIONS.ADDRESS})
  address?: Address;

  @Field(() => String, {nullable: true, description: LOCATION_DESCRIPTIONS.DETAILS})
  details?: string;
}
