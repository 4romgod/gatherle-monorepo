import 'reflect-metadata';
import {ID, Field, InputType, ObjectType} from 'type-graphql';
import {modelOptions, prop} from '@typegoose/typegoose';

import {EVENT_CATEGORY_DESCRIPTIONS} from '../constants';

@modelOptions({schemaOptions: {timestamps: true}})
@ObjectType('EventCategoryType', {description: EVENT_CATEGORY_DESCRIPTIONS.TYPE})
export class EventCategoryType {
    @prop({required: true, unique: true, index: true})
    @Field((type) => ID, {description: EVENT_CATEGORY_DESCRIPTIONS.ID})
    eventCategoryId: string;

    @prop({required: true, unique: true, index: true})
    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.SLUG})
    slug: string;

    @prop({required: true, unique: true})
    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.NAME})
    name: string;

    @prop({required: true})
    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.ICON_NAME})
    iconName: string;

    @prop({required: true})
    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.DESCRIPTION})
    description: string;

    @prop()
    @Field((type) => String, {nullable: true, description: EVENT_CATEGORY_DESCRIPTIONS.COLOR})
    color?: string;
}

@InputType('CreateEventCategoryInputType', {description: EVENT_CATEGORY_DESCRIPTIONS.CREATE_INPUT})
export class CreateEventCategoryInputType {
    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.NAME})
    name: string;

    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.ICON_NAME})
    iconName: string;

    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.DESCRIPTION})
    description: string;

    @Field((type) => String, {nullable: true, description: EVENT_CATEGORY_DESCRIPTIONS.COLOR})
    color?: string;
}

@InputType('UpdateEventCategoryInputType', {description: EVENT_CATEGORY_DESCRIPTIONS.UPDATE_INPUT})
export class UpdateEventCategoryInputType {
    @Field((type) => ID, {description: EVENT_CATEGORY_DESCRIPTIONS.ID})
    eventCategoryId: string;

    @Field((type) => String, {nullable: true, description: EVENT_CATEGORY_DESCRIPTIONS.NAME})
    name?: string;

    @Field((type) => String, {nullable: true, description: EVENT_CATEGORY_DESCRIPTIONS.ICON_NAME})
    iconName?: string;

    @Field((type) => String, {nullable: true, description: EVENT_CATEGORY_DESCRIPTIONS.DESCRIPTION})
    description?: string;

    @Field((type) => String, {nullable: true, description: EVENT_CATEGORY_DESCRIPTIONS.COLOR})
    color?: string;
}
