import { CustomError, ErrorTypes } from '@/utils';
import { MockMongoError } from '@/test/utils';

jest.mock('@/mongodb/models', () => ({
  EmailVerificationToken: {
    create: jest.fn(),
    findOne: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('mockSalt'),
  hash: jest.fn().mockResolvedValue('mockHash'),
  compare: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mockPlainToken'),
  }),
  randomUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

jest.mock('@/utils', () => ({
  CustomError: jest.fn((message: string, type: string) => {
    const err: any = new Error(message);
    err.extensions = { code: type };
    return err;
  }),
  ErrorTypes: {
    BAD_USER_INPUT: 'BAD_USER_INPUT',
    NOT_FOUND: 'NOT_FOUND',
  },
  KnownCommonError: jest.fn((err: unknown) => err),
  logDaoError: jest.fn(),
}));

jest.mock('@/utils/logger', () => {
  enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
  }
  return {
    LogLevel,
    LOG_LEVEL_MAP: { debug: LogLevel.DEBUG, info: LogLevel.INFO, warn: LogLevel.WARN, error: LogLevel.ERROR },
    initLogger: jest.fn(),
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  };
});

import { EmailVerificationTokenDAO } from '@/mongodb/dao';
import { EmailVerificationToken as EmailVerificationTokenModel } from '@/mongodb/models';
import { genSalt, hash, compare } from 'bcryptjs';

describe('EmailVerificationTokenDAO', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deletes existing tokens, creates a new one, and returns the composite token', async () => {
      (EmailVerificationTokenModel.deleteMany as jest.Mock).mockResolvedValue({});
      (EmailVerificationTokenModel.create as jest.Mock).mockResolvedValue({ _id: 'mock-id' });

      const result = await EmailVerificationTokenDAO.create('userId-1');

      expect(EmailVerificationTokenModel.deleteMany).toHaveBeenCalledWith({ userId: 'userId-1' });
      expect(genSalt).toHaveBeenCalledWith(10);
      expect(hash).toHaveBeenCalledWith('mockPlainToken', 'mockSalt');
      expect(EmailVerificationTokenModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'userId-1',
          tokenHash: 'mockHash',
          expiresAt: expect.any(Date),
        }),
      );
      expect(result).toBe('mock-id.mockPlainToken');
    });

    it('sets expiry approximately 24 hours in the future', async () => {
      (EmailVerificationTokenModel.deleteMany as jest.Mock).mockResolvedValue({});
      (EmailVerificationTokenModel.create as jest.Mock).mockResolvedValue({ _id: 'mock-id' });

      const before = Date.now();
      await EmailVerificationTokenDAO.create('userId-1');
      const after = Date.now();

      const createdWith = (EmailVerificationTokenModel.create as jest.Mock).mock.calls[0][0];
      const expiresAt: Date = createdWith.expiresAt;
      const msUntilExpiry = expiresAt.getTime() - before;

      // Should be ~24 hours (within a 2-second window for test execution)
      const twentyFourHours = 24 * 60 * 60 * 1000;
      expect(msUntilExpiry).toBeGreaterThanOrEqual(twentyFourHours - 2000);
      expect(msUntilExpiry).toBeLessThanOrEqual(twentyFourHours + (after - before) + 100);
    });

    it('throws when deleteMany fails', async () => {
      (EmailVerificationTokenModel.deleteMany as jest.Mock).mockRejectedValue(new MockMongoError(11000));

      await expect(EmailVerificationTokenDAO.create('userId-1')).rejects.toBeDefined();
    });

    it('throws when create fails', async () => {
      (EmailVerificationTokenModel.deleteMany as jest.Mock).mockResolvedValue({});
      (EmailVerificationTokenModel.create as jest.Mock).mockRejectedValue(new MockMongoError(11000));

      await expect(EmailVerificationTokenDAO.create('userId-1')).rejects.toBeDefined();
    });
  });

  describe('verify', () => {
    const mockTokenDoc = {
      userId: 'userId-1',
      tokenHash: 'storedHash',
      expiresAt: new Date(Date.now() + 86400000),
    };

    it('returns userId when the composite token matches the stored hash', async () => {
      (EmailVerificationTokenModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTokenDoc),
      });
      (compare as jest.Mock).mockResolvedValue(true);

      const result = await EmailVerificationTokenDAO.verify('mock-id.storedSecret');

      expect(result).toBe('userId-1');
      expect(compare).toHaveBeenCalledWith('storedSecret', 'storedHash');
    });

    it('throws BAD_USER_INPUT when the token has no separator', async () => {
      await expect(EmailVerificationTokenDAO.verify('malformedtoken')).rejects.toBeDefined();
      expect(CustomError).toHaveBeenCalledWith(
        expect.stringContaining('invalid or has expired'),
        ErrorTypes.BAD_USER_INPUT,
      );
      expect(EmailVerificationTokenModel.findOne).not.toHaveBeenCalled();
    });

    it('throws BAD_USER_INPUT when the secret does not match', async () => {
      (EmailVerificationTokenModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTokenDoc),
      });
      (compare as jest.Mock).mockResolvedValue(false);

      await expect(EmailVerificationTokenDAO.verify('mock-id.wrongSecret')).rejects.toBeDefined();
      expect(CustomError).toHaveBeenCalledWith(
        expect.stringContaining('invalid or has expired'),
        ErrorTypes.BAD_USER_INPUT,
      );
    });

    it('throws BAD_USER_INPUT when no non-expired document exists for that id', async () => {
      (EmailVerificationTokenModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(EmailVerificationTokenDAO.verify('nonexistent-id.anySecret')).rejects.toBeDefined();
      expect(CustomError).toHaveBeenCalledWith(
        expect.stringContaining('invalid or has expired'),
        ErrorTypes.BAD_USER_INPUT,
      );
    });

    it('queries by tokenId and filters out expired documents', async () => {
      (EmailVerificationTokenModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(EmailVerificationTokenDAO.verify('some-id.someSecret')).rejects.toBeDefined();
      expect(EmailVerificationTokenModel.findOne).toHaveBeenCalledWith({
        _id: 'some-id',
        expiresAt: { $gt: expect.any(Date) },
      });
    });

    it('throws when the database query fails', async () => {
      (EmailVerificationTokenModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockRejectedValue(new MockMongoError(10107)),
      });

      await expect(EmailVerificationTokenDAO.verify('mock-id.anySecret')).rejects.toBeDefined();
    });
  });

  describe('deleteByUserId', () => {
    it('calls deleteMany with the given userId', async () => {
      (EmailVerificationTokenModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 1 });

      await EmailVerificationTokenDAO.deleteByUserId('userId-1');

      expect(EmailVerificationTokenModel.deleteMany).toHaveBeenCalledWith({ userId: 'userId-1' });
    });

    it('resolves without error when no tokens exist', async () => {
      (EmailVerificationTokenModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 0 });

      await expect(EmailVerificationTokenDAO.deleteByUserId('userId-no-tokens')).resolves.toBeUndefined();
    });

    it('throws when deleteMany fails', async () => {
      (EmailVerificationTokenModel.deleteMany as jest.Mock).mockRejectedValue(new MockMongoError(10107));

      await expect(EmailVerificationTokenDAO.deleteByUserId('userId-1')).rejects.toBeDefined();
    });
  });
});
