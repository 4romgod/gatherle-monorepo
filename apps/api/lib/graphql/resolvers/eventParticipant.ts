import 'reflect-metadata';
import {Arg, Authorized, FieldResolver, Mutation, Query, Resolver, Root} from 'type-graphql';
import {CancelEventParticipantInput, EventParticipant, UpsertEventParticipantInput, User, UserRole} from '@ntlango/commons/types';
import {EventParticipantDAO, UserDAO} from '@/mongodb/dao';
import {validateMongodbId} from '@/validation';

@Resolver(() => EventParticipant)
export class EventParticipantResolver {
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => EventParticipant)
  async upsertEventParticipant(@Arg('input', () => UpsertEventParticipantInput) input: UpsertEventParticipantInput): Promise<EventParticipant> {
    validateMongodbId(input.eventId);
    validateMongodbId(input.userId);
    return EventParticipantDAO.upsert(input);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => EventParticipant)
  async cancelEventParticipant(@Arg('input', () => CancelEventParticipantInput) input: CancelEventParticipantInput): Promise<EventParticipant> {
    validateMongodbId(input.eventId);
    validateMongodbId(input.userId);
    return EventParticipantDAO.cancel(input);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [EventParticipant])
  async readEventParticipants(@Arg('eventId', () => String) eventId: string): Promise<EventParticipant[]> {
    validateMongodbId(eventId);
    return EventParticipantDAO.readByEvent(eventId);
  }

  @FieldResolver(() => User, {nullable: true})
  async user(@Root() participant: EventParticipant): Promise<User | null> {
    if (!participant.userId) {
      return null;
    }

    try {
      return UserDAO.readUserById(participant.userId);
    } catch {
      return null;
    }
  }
}
