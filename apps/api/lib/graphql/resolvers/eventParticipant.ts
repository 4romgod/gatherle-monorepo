import 'reflect-metadata';
import {Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root} from 'type-graphql';
import {CancelEventParticipantInput, EventParticipant, UpsertEventParticipantInput, User, UserRole} from '@ntlango/commons/types';
import {EventParticipantDAO} from '@/mongodb/dao';
import {validateMongodbId} from '@/validation';
import type {ServerContext} from '@/graphql';

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
  async user(@Root() participant: EventParticipant, @Ctx() context: ServerContext): Promise<User | null> {
    if (!participant.userId) {
      return null;
    }

    // If already populated (check on participant object which may have user field from population)
    const participantAny = participant as any;
    if (participantAny.user && typeof participantAny.user === 'object' && 'userId' in participantAny.user) {
      return participantAny.user as User;
    }

    // Batch-load via DataLoader
    try {
      return await context.loaders.user.load(participant.userId);
    } catch {
      return null;
    }
  }
}
