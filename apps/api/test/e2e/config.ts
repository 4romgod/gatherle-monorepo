import { STAGE } from '@/constants';
import { APPLICATION_STAGES } from '@gatherle/commons';

export interface E2ETestConfig {
  testUrl?: string;
  stage: string;
  useLocalServer: boolean;
  localServerPort: number;
}

export const getE2ETestConfig = (): E2ETestConfig => {
  const stage = STAGE;
  const useLocalServer = stage === APPLICATION_STAGES.DEV;
  const localServerPort = parseInt(process.env.TEST_PORT || '5000', 10);

  let testUrl: string | undefined;

  if (useLocalServer) {
    // Dev stage - will start local server
    testUrl = `http://localhost:${localServerPort}/v1/graphql`;
    console.log(`[E2E Tests] Stage: ${stage} - Will start local server on port ${localServerPort}`);
  } else {
    // Beta/Prod - use deployed endpoint from GRAPHQL_URL
    testUrl = process.env.GRAPHQL_URL;
    if (!testUrl) {
      throw new Error(
        `GRAPHQL_URL environment variable is required for STAGE=${stage}. ` + `Set it to the deployed API endpoint.`,
      );
    }
    console.log(`[E2E Tests] Stage: ${stage} - Testing against: ${testUrl}`);
  }

  return {
    testUrl,
    stage,
    useLocalServer,
    localServerPort,
  };
};
