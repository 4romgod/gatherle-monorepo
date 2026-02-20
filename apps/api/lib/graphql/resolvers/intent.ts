import 'reflect-metadata';
import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { Intent, UpsertIntentInput, UserRole } from '@gatherle/commons/types';
import { UpsertIntentInputSchema } from '@/validation/zod';
import { validateInput } from '@/validation';
import { IntentDAO } from '@/mongodb/dao';
import type { ServerContext } from '@/graphql';
import { RESOLVER_DESCRIPTIONS } from '@/constants';
import { getAuthenticatedUser } from '@/utils';

@Resolver(() => Intent)
export class IntentResolver {
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Intent, { description: RESOLVER_DESCRIPTIONS.INTENT.upsertIntent })
  async upsertIntent(
    @Arg('input', () => UpsertIntentInput) input: UpsertIntentInput,
    @Ctx() context: ServerContext,
  ): Promise<Intent> {
    validateInput(UpsertIntentInputSchema, input);
    const user = getAuthenticatedUser(context);
    return IntentDAO.upsert({ ...input, userId: user.userId });
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [Intent], { description: RESOLVER_DESCRIPTIONS.INTENT.readIntentsByUser })
  async readIntentsByUser(@Ctx() context: ServerContext): Promise<Intent[]> {
    const user = getAuthenticatedUser(context);
    return IntentDAO.readByUser(user.userId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [Intent], { description: RESOLVER_DESCRIPTIONS.INTENT.readIntentsByEvent })
  async readIntentsByEvent(
    @Arg('eventId', () => String) eventId: string,
    @Ctx() context: ServerContext,
  ): Promise<Intent[]> {
    getAuthenticatedUser(context);
    return IntentDAO.readByEvent(eventId);
  }
}
