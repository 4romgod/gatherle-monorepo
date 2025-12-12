import 'reflect-metadata';
import {Field, ID, InputType, ObjectType, registerEnumType} from 'type-graphql';
import {index, modelOptions, prop, Severity} from '@typegoose/typegoose';

export enum ParticipantStatus {
    Interested = 'Interested',
    Going = 'Going',
    Waitlisted = 'Waitlisted',
    Cancelled = 'Cancelled',
    CheckedIn = 'CheckedIn',
}

export enum ParticipantVisibility {
    Public = 'Public',
    Followers = 'Followers',
    Private = 'Private',
}

registerEnumType(ParticipantStatus, {name: 'ParticipantStatus'});
registerEnumType(ParticipantVisibility, {name: 'ParticipantVisibility'});

@ObjectType('EventParticipant')
@index({eventId: 1, userId: 1}, {unique: true})
@modelOptions({schemaOptions: {timestamps: true}, options: {allowMixed: Severity.ALLOW}})
export class EventParticipant {
    @prop({required: true, unique: true, index: true})
    @Field(() => ID)
    participantId: string;

    @prop({required: true})
    @Field(() => ID)
    eventId: string;

    @prop({required: true})
    @Field(() => ID)
    userId: string;

    @prop({enum: ParticipantStatus, required: true, default: ParticipantStatus.Going})
    @Field(() => ParticipantStatus)
    status: ParticipantStatus;

    @prop({default: 1})
    @Field(() => Number, {nullable: true})
    quantity?: number;

    @prop()
    @Field(() => ID, {nullable: true})
    invitedBy?: string;

    @prop({enum: ParticipantVisibility, default: ParticipantVisibility.Followers})
    @Field(() => ParticipantVisibility, {nullable: true})
    sharedVisibility?: ParticipantVisibility;

    @prop()
    @Field(() => Date, {nullable: true})
    rsvpAt?: Date;

    @prop()
    @Field(() => Date, {nullable: true})
    cancelledAt?: Date;

    @prop()
    @Field(() => Date, {nullable: true})
    checkedInAt?: Date;
}

@InputType('UpsertEventParticipantInput')
export class UpsertEventParticipantInput {
    @Field(() => ID)
    eventId: string;

    @Field(() => ID)
    userId: string;

    @Field(() => ParticipantStatus)
    status: ParticipantStatus;

    @Field(() => Number, {nullable: true})
    quantity?: number;

    @Field(() => ID, {nullable: true})
    invitedBy?: string;

    @Field(() => ParticipantVisibility, {nullable: true})
    sharedVisibility?: ParticipantVisibility;
}

@InputType('CancelEventParticipantInput')
export class CancelEventParticipantInput {
    @Field(() => ID)
    eventId: string;

    @Field(() => ID)
    userId: string;
}
