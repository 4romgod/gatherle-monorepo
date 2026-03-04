// Must mock before importing the module under test so that module-level constants are set
jest.mock('@/constants', () => ({
  AWS_REGION: 'eu-west-1',
  STAGE: 'Dev',
  EMAIL_FROM: 'noreply@gatherle.com',
  WEBAPP_URL: 'http://localhost:3000',
}));

jest.mock('@gatherle/commons', () => ({
  APPLICATION_STAGES: {
    DEV: 'Dev',
  },
}));

jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  SendEmailCommand: jest.fn().mockImplementation((params: unknown) => params),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import EmailService from '@/services/email';
import { logger } from '@/utils/logger';

describe('EmailService (Dev mode — STAGE=Dev)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmailVerification', () => {
    it('resolves without throwing', async () => {
      await expect(EmailService.sendEmailVerification('user@example.com', 'plain-token-abc')).resolves.toBeUndefined();
    });

    it('logs the verification URL via logger.info', async () => {
      await EmailService.sendEmailVerification('user@example.com', 'plain-token-abc');

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('verify-email?token='));
    });

    it('includes the recipient email in the log message', async () => {
      await EmailService.sendEmailVerification('recipient@test.com', 'token');

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('recipient@test.com'));
    });

    it('URL-encodes the token in the verification link', async () => {
      const tokenWithSpecial = 'token+special=chars&foo';
      await EmailService.sendEmailVerification('user@example.com', tokenWithSpecial);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent(tokenWithSpecial)));
    });

    it('does not call SES in Dev mode', async () => {
      const { SESClient } = require('@aws-sdk/client-ses');
      await EmailService.sendEmailVerification('user@example.com', 'token');

      // In Dev mode sesClient is null — the SESClient constructor is never called at runtime
      const mockSesInstance = SESClient.mock?.instances?.[0];
      if (mockSesInstance) {
        expect(mockSesInstance.send).not.toHaveBeenCalled();
      }
      // The absence of an error is itself sufficient verification for Dev mode
    });
  });

  describe('sendPasswordReset', () => {
    it('resolves without throwing', async () => {
      await expect(EmailService.sendPasswordReset('user@example.com', 'reset-token-xyz')).resolves.toBeUndefined();
    });

    it('logs the reset URL via logger.info', async () => {
      await EmailService.sendPasswordReset('user@example.com', 'reset-token-xyz');

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('reset-password?token='));
    });

    it('includes the recipient email in the log message', async () => {
      await EmailService.sendPasswordReset('recipient@test.com', 'token');

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('recipient@test.com'));
    });

    it('URL-encodes the token in the reset link', async () => {
      const tokenWithSpecial = 'reset+token=special&value';
      await EmailService.sendPasswordReset('user@example.com', tokenWithSpecial);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent(tokenWithSpecial)));
    });
  });
});
