import 'reflect-metadata';
import {Field, InputType, ObjectType} from 'type-graphql';

@ObjectType()
export class EventCategoryType {
    @Field()
    id: string;

    @Field()
    slug: string;

    @Field()
    name: string;

    @Field()
    iconName: string;

    @Field()
    description: string;

    @Field({nullable: true})
    color?: string;
}

@InputType()
export class CreateEventCategoryInputType {
    @Field()
    name: string;

    @Field()
    iconName: string;

    @Field()
    description: string;

    @Field({nullable: true})
    color?: string;
}

@InputType()
export class UpdateEventCategoryInputType {
    @Field()
    id: string;

    @Field({nullable: true})
    name?: string;

    @Field({nullable: true})
    iconName?: string;

    @Field({nullable: true})
    description?: string;

    @Field({nullable: true})
    color?: string;
}
