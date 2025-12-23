import 'reflect-metadata';
import {Field, ID, InputType, ObjectType, registerEnumType} from 'type-graphql';
import {modelOptions, prop, Severity} from '@typegoose/typegoose';

import {VENUE_DESCRIPTIONS} from '../constants';

export enum VenueType {
    Physical = 'Physical',
    Virtual = 'Virtual',
    Hybrid = 'Hybrid',
}

registerEnumType(VenueType, {
    name: 'VenueType',
    description: VENUE_DESCRIPTIONS.TYPE,
});

@ObjectType('VenueAddress', {description: VENUE_DESCRIPTIONS.ADDRESS})
export class VenueAddress {
    @prop({type: () => String})
    @Field(() => String, {nullable: true, description: VENUE_DESCRIPTIONS.STREET})
    street?: string;

    @prop({required: true, type: () => String})
    @Field(() => String, {description: VENUE_DESCRIPTIONS.CITY})
    city: string;

    @prop({type: () => String})
    @Field(() => String, {nullable: true, description: VENUE_DESCRIPTIONS.REGION})
    region?: string;

    @prop({required: true, type: () => String})
    @Field(() => String, {description: VENUE_DESCRIPTIONS.COUNTRY})
    country: string;

    @prop({type: () => String})
    @Field(() => String, {nullable: true, description: VENUE_DESCRIPTIONS.POSTAL_CODE})
    postalCode?: string;
}

@InputType('VenueAddressInput')
export class VenueAddressInput {
    @Field(() => String, {nullable: true, description: VENUE_DESCRIPTIONS.STREET})
    street?: string;

    @Field(() => String, {description: VENUE_DESCRIPTIONS.CITY})
    city: string;

    @Field(() => String, {nullable: true, description: VENUE_DESCRIPTIONS.REGION})
    region?: string;

    @Field(() => String, {description: VENUE_DESCRIPTIONS.COUNTRY})
    country: string;

    @Field(() => String, {nullable: true, description: VENUE_DESCRIPTIONS.POSTAL_CODE})
    postalCode?: string;
}

@ObjectType('VenueGeo', {description: VENUE_DESCRIPTIONS.GEO})
export class VenueGeo {
    @prop({required: true, type: () => Number})
    @Field(() => Number, {description: VENUE_DESCRIPTIONS.LATITUDE})
    latitude: number;

    @prop({required: true, type: () => Number})
    @Field(() => Number, {description: VENUE_DESCRIPTIONS.LONGITUDE})
    longitude: number;
}

@InputType('VenueGeoInput')
export class VenueGeoInput {
    @Field(() => Number, {description: VENUE_DESCRIPTIONS.LATITUDE})
    latitude: number;

    @Field(() => Number, {description: VENUE_DESCRIPTIONS.LONGITUDE})
    longitude: number;
}

@modelOptions({schemaOptions: {timestamps: true}, options: {allowMixed: Severity.ALLOW}})
@ObjectType('Venue', {description: VENUE_DESCRIPTIONS.TYPE})
export class Venue {
    @prop({required: true, unique: true, type: () => String})
    @Field(() => ID, {description: VENUE_DESCRIPTIONS.ID})
    venueId: string;

    @prop({type: () => String})
    @Field(() => ID, {nullable: true, description: VENUE_DESCRIPTIONS.ORGANIZATION_ID})
    orgId?: string;

    @prop({required: true, enum: VenueType, type: () => String})
    @Field(() => VenueType, {description: VENUE_DESCRIPTIONS.TYPE})
    type: VenueType;

    @prop({required: true, type: () => String})
    @Field(() => String, {description: VENUE_DESCRIPTIONS.NAME})
    name: string;

    @prop({type: () => VenueAddress})
    @Field(() => VenueAddress, {nullable: true, description: VENUE_DESCRIPTIONS.ADDRESS})
    address?: VenueAddress;

    @prop({type: () => VenueGeo})
    @Field(() => VenueGeo, {nullable: true, description: VENUE_DESCRIPTIONS.GEO})
    geo?: VenueGeo;

    @prop({type: () => String})
    @Field(() => String, {nullable: true, description: VENUE_DESCRIPTIONS.URL})
    url?: string;

    @prop({type: () => Number})
    @Field(() => Number, {nullable: true, description: VENUE_DESCRIPTIONS.CAPACITY})
    capacity?: number;

    @prop({type: () => [String], default: []})
    @Field(() => [String], {nullable: true, description: VENUE_DESCRIPTIONS.AMENITIES})
    amenities?: string[];
}

@InputType('CreateVenueInput', {description: VENUE_DESCRIPTIONS.CREATE_INPUT})
export class CreateVenueInput {
    @Field(() => ID, {nullable: true, description: VENUE_DESCRIPTIONS.ORGANIZATION_ID})
    orgId?: string;

    @Field(() => VenueType, {description: VENUE_DESCRIPTIONS.TYPE})
    type: VenueType;

    @Field(() => String, {description: VENUE_DESCRIPTIONS.NAME})
    name: string;

    @Field(() => VenueAddressInput, {nullable: true, description: VENUE_DESCRIPTIONS.ADDRESS})
    address?: VenueAddressInput;

    @Field(() => VenueGeoInput, {nullable: true, description: VENUE_DESCRIPTIONS.GEO})
    geo?: VenueGeoInput;

    @Field(() => String, {nullable: true, description: VENUE_DESCRIPTIONS.URL})
    url?: string;

    @Field(() => Number, {nullable: true, description: VENUE_DESCRIPTIONS.CAPACITY})
    capacity?: number;

    @Field(() => [String], {nullable: true, description: VENUE_DESCRIPTIONS.AMENITIES})
    amenities?: string[];
}

@InputType('UpdateVenueInput', {description: VENUE_DESCRIPTIONS.UPDATE_INPUT})
export class UpdateVenueInput {
    @Field(() => ID, {description: VENUE_DESCRIPTIONS.ID})
    venueId: string;

    @Field(() => ID, {nullable: true, description: VENUE_DESCRIPTIONS.ORGANIZATION_ID})
    orgId?: string;

    @Field(() => VenueType, {nullable: true, description: VENUE_DESCRIPTIONS.TYPE})
    type?: VenueType;

    @Field(() => String, {nullable: true, description: VENUE_DESCRIPTIONS.NAME})
    name?: string;

    @Field(() => VenueAddressInput, {nullable: true, description: VENUE_DESCRIPTIONS.ADDRESS})
    address?: VenueAddressInput;

    @Field(() => VenueGeoInput, {nullable: true, description: VENUE_DESCRIPTIONS.GEO})
    geo?: VenueGeoInput;

    @Field(() => String, {nullable: true, description: VENUE_DESCRIPTIONS.URL})
    url?: string;

    @Field(() => Number, {nullable: true, description: VENUE_DESCRIPTIONS.CAPACITY})
    capacity?: number;

    @Field(() => [String], {nullable: true, description: VENUE_DESCRIPTIONS.AMENITIES})
    amenities?: string[];
}
