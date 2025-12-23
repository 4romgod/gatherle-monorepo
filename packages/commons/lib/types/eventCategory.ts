import 'reflect-metadata';
import {ID, Field, InputType, ObjectType} from 'type-graphql';
import {modelOptions, prop} from '@typegoose/typegoose';

import {EVENT_CATEGORY_DESCRIPTIONS} from '../constants';

@modelOptions({schemaOptions: {timestamps: true}})
@ObjectType('EventCategory', {description: EVENT_CATEGORY_DESCRIPTIONS.TYPE})
export class EventCategory {
    @prop({required: true, unique: true, index: true, type: () => String})
    @Field((type) => ID, {description: EVENT_CATEGORY_DESCRIPTIONS.ID})
    eventCategoryId: string;

    @prop({required: true, unique: true, index: true, type: () => String})
    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.SLUG})
    slug: string;

    @prop({required: true, unique: true, type: () => String})
    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.NAME})
    name: string;

    @prop({required: true, type: () => String})
    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.ICON_NAME})
    iconName: string;

    @prop({required: true, type: () => String})
    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.DESCRIPTION})
    description: string;

    @prop({type: () => String})
    @Field((type) => String, {nullable: true, description: EVENT_CATEGORY_DESCRIPTIONS.COLOR})
    color?: string;
}

@InputType('CreateEventCategoryInput', {description: EVENT_CATEGORY_DESCRIPTIONS.CREATE_INPUT})
export class CreateEventCategoryInput {
    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.NAME})
    name: string;

    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.ICON_NAME})
    iconName: string;

    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.DESCRIPTION})
    description: string;

    @Field((type) => String, {nullable: true, description: EVENT_CATEGORY_DESCRIPTIONS.COLOR})
    color?: string;
}

@InputType('UpdateEventCategoryInput', {description: EVENT_CATEGORY_DESCRIPTIONS.UPDATE_INPUT})
export class UpdateEventCategoryInput {
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
