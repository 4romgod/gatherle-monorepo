import { readRuntimeContext } from './runtimeContext';
import { cleanupOrphanedE2EUsers } from './utils/userResolverHelpers';
import { UserRole } from '@gatherle/commons/server/types';

const teardown = async () => {
  const graphqlUrl = process.env.GRAPHQL_URL;
  if (!graphqlUrl) {
    return;
  }

  const runtimeContext = readRuntimeContext();
  const adminToken = Object.values(runtimeContext?.seededUsersByEmail ?? {}).find(
    (user) => user.userRole === UserRole.Admin,
  )?.token;

  if (!adminToken) {
    return;
  }

  try {
    await cleanupOrphanedE2EUsers(
      graphqlUrl,
      adminToken,
      'globalTeardown-orphaned-e2e-user-cleanup',
      runtimeContext?.e2eUserNamespace,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[teardown] failed to sweep orphaned API e2e users: ${message}`);
  }
};

export default teardown;
