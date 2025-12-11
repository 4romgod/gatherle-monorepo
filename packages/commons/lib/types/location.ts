import 'reflect-metadata';
import {ObjectType, Field} from 'type-graphql';
import {prop, modelOptions, Severity} from '@typegoose/typegoose';

import {EVENT_DESCRIPTIONS, LOCATION_DESCRIPTIONS} from '../constants';

@ObjectType('Coordinates', {description: LOCATION_DESCRIPTIONS.COORDINATES})
class Coordinates {
    @prop({required: true})
    @Field((type) => Number, {description: LOCATION_DESCRIPTIONS.LATITUDE})
    latitude: number;

    @prop({required: true})
    @Field((type) => Number, {description: LOCATION_DESCRIPTIONS.LONGITUDE})
    longitude: number;
}

@ObjectType('Address', {description: LOCATION_DESCRIPTIONS.ADDRESS})
class Address {
    @prop()
    @Field((type) => String, {nullable: true, description: LOCATION_DESCRIPTIONS.STREET})
    street?: string;

    @prop({required: true})
    @Field((type) => String, {description: LOCATION_DESCRIPTIONS.CITY})
    city: string;

    @prop({required: true})
    @Field((type) => String, {description: LOCATION_DESCRIPTIONS.STATE})
    state: string;

    @prop({required: true})
    @Field((type) => String, {description: LOCATION_DESCRIPTIONS.ZIP_CODE})
    zipCode: string;

    @prop({required: true})
    @Field((type) => String, {description: LOCATION_DESCRIPTIONS.COUNTRY})
    country: string;
}

@modelOptions({options: {allowMixed: Severity.ALLOW}})
@ObjectType('Location', {description: EVENT_DESCRIPTIONS.EVENT.LOCATION})
export class Location {
    @prop({required: true})
    @Field((type) => String, {description: LOCATION_DESCRIPTIONS.LOCATION_TYPE})
    locationType: 'venue' | 'online' | 'tba';

    @prop({type: () => Coordinates})
    @Field(() => Coordinates, {nullable: true, description: LOCATION_DESCRIPTIONS.COORDINATES})
    coordinates?: Coordinates;

    @prop({type: () => Address})
    @Field(() => Address, {nullable: true, description: LOCATION_DESCRIPTIONS.ADDRESS})
    address?: Address;

    @prop()
    @Field(() => String, {nullable: true, description: LOCATION_DESCRIPTIONS.DETAILS})
    details?: string;
}
