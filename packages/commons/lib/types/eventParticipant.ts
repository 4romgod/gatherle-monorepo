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
@modelOptions({schemaOptions: {timestamps: true}, options: {allowMixed: Severity.ALLOW}})
@index({eventId: 1, userId: 1}, {unique: true})
export class EventParticipant {
    @prop({required: true, unique: true, index: true, type: () => String})
    @Field(() => ID)
    participantId: string;

    @prop({required: true, type: () => String})
    @Field(() => ID)
    eventId: string;

    @prop({required: true, type: () => String})
    @Field(() => ID)
    userId: string;

    @prop({enum: ParticipantStatus, required: true, default: ParticipantStatus.Going, type: () => String})
    @Field(() => ParticipantStatus)
    status: ParticipantStatus;

    @prop({default: 1, type: () => Number})
    @Field(() => Number, {nullable: true})
    quantity?: number;

    @prop({type: () => String})
    @Field(() => ID, {nullable: true})
    invitedBy?: string;

    @prop({enum: ParticipantVisibility, default: ParticipantVisibility.Followers, type: () => String})
    @Field(() => ParticipantVisibility, {nullable: true})
    sharedVisibility?: ParticipantVisibility;

    @prop({type: () => Date})
    @Field(() => Date, {nullable: true})
    rsvpAt?: Date;

    @prop({type: () => Date})
    @Field(() => Date, {nullable: true})
    cancelledAt?: Date;

    @prop({type: () => Date})
    @Field(() => Date, {nullable: true})
    checkedInAt?: Date;
}

@InputType('UpsertEventParticipantInput')
export class UpsertEventParticipantInput {
    @Field(() => ID)
    eventId: string;

    @Field(() => ID)
    userId: string;

    @Field(() => ParticipantStatus, {defaultValue: ParticipantStatus.Going})
    status?: ParticipantStatus;

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
