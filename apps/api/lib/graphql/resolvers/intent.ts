import 'reflect-metadata';
import {Arg, Ctx, Mutation, Query, Resolver} from 'type-graphql';
import {Intent, UpsertIntentInput} from '@ntlango/commons/types';
import {UpsertIntentInputSchema} from '@/validation/zod';
import {validateInput} from '@/validation';
import {IntentDAO} from '@/mongodb/dao';
import {ServerContext} from '@/graphql';
import {requireAuthenticatedUser} from './utils/requireAuthenticatedUser';
import {RESOLVER_DESCRIPTIONS} from '@/constants';

@Resolver(() => Intent)
export class IntentResolver {
  @Mutation(() => Intent, {description: RESOLVER_DESCRIPTIONS.INTENT.upsertIntent})
  async upsertIntent(@Arg('input', () => UpsertIntentInput) input: UpsertIntentInput, @Ctx() context: ServerContext): Promise<Intent> {
    validateInput(UpsertIntentInputSchema, input);
    const user = await requireAuthenticatedUser(context);
    return IntentDAO.upsert({...input, userId: user.userId});
  }

  @Query(() => [Intent], {description: RESOLVER_DESCRIPTIONS.INTENT.readIntentsByUser})
  async readIntentsByUser(@Ctx() context: ServerContext): Promise<Intent[]> {
    const user = await requireAuthenticatedUser(context);
    return IntentDAO.readByUser(user.userId);
  }

  @Query(() => [Intent], {description: RESOLVER_DESCRIPTIONS.INTENT.readIntentsByEvent})
  async readIntentsByEvent(@Arg('eventId', () => String) eventId: string): Promise<Intent[]> {
    return IntentDAO.readByEvent(eventId);
  }
}
