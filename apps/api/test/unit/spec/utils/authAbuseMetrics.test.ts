jest.mock('@/constants', () => ({
  ...jest.requireActual('@/constants'),
  STAGE: 'Beta',
  AWS_REGION: 'af-south-1',
}));

describe('authAbuseMetrics', () => {
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

  beforeEach(() => {
    consoleLogSpy.mockClear();
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  it('emits CloudWatch Embedded Metric Format logs for auth abuse signals', async () => {
    const { AUTH_ABUSE_METRIC_NAMESPACE, emitAuthAbuseMetric } = await import('@/utils/authAbuseMetrics');

    emitAuthAbuseMetric('LoginFailure');

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

    expect(payload).toMatchObject({
      Stage: 'Beta',
      Region: 'af-south-1',
      LoginFailure: 1,
    });
    expect(payload._aws.CloudWatchMetrics).toEqual([
      {
        Namespace: AUTH_ABUSE_METRIC_NAMESPACE,
        Dimensions: [['Stage', 'Region']],
        Metrics: [{ Name: 'LoginFailure', Unit: 'Count' }],
      },
    ]);
  });
});
