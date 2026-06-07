import 'reflect-metadata';
import { Arg, Authorized, Ctx, Mutation, Resolver } from 'type-graphql';
import { RegisterPushSubscriptionInputSchema } from '@gatherle/commons/server/validation';
import { PushSubscription, RegisterPushSubscriptionInput, UserRole } from '@gatherle/commons/server/types';
import { PushSubscriptionDAO } from '@/mongodb/dao';
import type { ServerContext } from '@/graphql';
import { getAuthenticatedUser } from '@/utils';
import { validateInput } from '@/validation';

@Resolver(() => PushSubscription)
export class PushSubscriptionResolver {
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => PushSubscription, {
    description: 'Register or refresh the current device push token for the authenticated user.',
  })
  async registerPushSubscription(
    @Arg('input', () => RegisterPushSubscriptionInput) input: RegisterPushSubscriptionInput,
    @Ctx() context: ServerContext,
  ): Promise<PushSubscription> {
    validateInput(RegisterPushSubscriptionInputSchema, input);
    const user = getAuthenticatedUser(context);
    return PushSubscriptionDAO.register(user.userId, input);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Boolean, {
    description: 'Deactivate a push token for the authenticated user.',
  })
  async unregisterPushSubscription(
    @Arg('token', () => String) token: string,
    @Ctx() context: ServerContext,
  ): Promise<boolean> {
    const user = getAuthenticatedUser(context);
    return PushSubscriptionDAO.deactivateForUser(user.userId, token);
  }
}
