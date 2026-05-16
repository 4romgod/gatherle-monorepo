import { APPLICATION_STAGES } from '@gatherle/commons';

export const DEFAULT_WEBSOCKET_STAGE_THROTTLE_RATE_LIMITS: Record<string, number> = {
  [APPLICATION_STAGES.DEV]: 25,
  [APPLICATION_STAGES.BETA]: 12,
  [APPLICATION_STAGES.GAMMA]: 20,
  [APPLICATION_STAGES.PROD]: 40,
};

export const DEFAULT_WEBSOCKET_STAGE_THROTTLE_BURST_LIMITS: Record<string, number> = {
  [APPLICATION_STAGES.DEV]: 50,
  [APPLICATION_STAGES.BETA]: 24,
  [APPLICATION_STAGES.GAMMA]: 40,
  [APPLICATION_STAGES.PROD]: 80,
};

export const DEFAULT_WEBSOCKET_ROUTE_THROTTLES: Record<
  string,
  {
    pingRateLimit: number;
    pingBurstLimit: number;
    subscribeRateLimit: number;
    subscribeBurstLimit: number;
    chatSendRateLimit: number;
    chatSendBurstLimit: number;
    chatReadRateLimit: number;
    chatReadBurstLimit: number;
  }
> = {
  [APPLICATION_STAGES.DEV]: {
    pingRateLimit: 8,
    pingBurstLimit: 16,
    subscribeRateLimit: 4,
    subscribeBurstLimit: 8,
    chatSendRateLimit: 4,
    chatSendBurstLimit: 8,
    chatReadRateLimit: 6,
    chatReadBurstLimit: 12,
  },
  [APPLICATION_STAGES.BETA]: {
    pingRateLimit: 3,
    pingBurstLimit: 6,
    subscribeRateLimit: 2,
    subscribeBurstLimit: 4,
    chatSendRateLimit: 2,
    chatSendBurstLimit: 4,
    chatReadRateLimit: 4,
    chatReadBurstLimit: 8,
  },
  [APPLICATION_STAGES.GAMMA]: {
    pingRateLimit: 6,
    pingBurstLimit: 12,
    subscribeRateLimit: 3,
    subscribeBurstLimit: 6,
    chatSendRateLimit: 3,
    chatSendBurstLimit: 6,
    chatReadRateLimit: 5,
    chatReadBurstLimit: 10,
  },
  [APPLICATION_STAGES.PROD]: {
    pingRateLimit: 10,
    pingBurstLimit: 20,
    subscribeRateLimit: 5,
    subscribeBurstLimit: 10,
    chatSendRateLimit: 5,
    chatSendBurstLimit: 10,
    chatReadRateLimit: 8,
    chatReadBurstLimit: 16,
  },
};
