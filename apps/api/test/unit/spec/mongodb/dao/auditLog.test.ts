import { AuditLogDAO } from '@/mongodb/dao';
import { AuditLog as AuditLogModel } from '@/mongodb/models';
import { AuditAction, AuditTargetType, UserRole } from '@gatherle/commons/server/types';
import { CustomError, ErrorTypes } from '@/utils';
import { ERROR_MESSAGES } from '@/validation';

jest.mock('@/mongodb/models', () => ({
  AuditLog: {
    create: jest.fn(),
    find: jest.fn(),
  },
}));

const createMockFindQuery = <T>(result: T) => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(result),
});

describe('AuditLogDAO', () => {
  const baseWriteInput = {
    actorId: 'user-1',
    actorRole: UserRole.Admin,
    action: AuditAction.USER_DELETED,
    targetType: AuditTargetType.User,
    targetId: 'user-2',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── write ──────────────────────────────────────────────────────────────────

  describe('write', () => {
    it('creates an audit log document', async () => {
      (AuditLogModel.create as jest.Mock).mockResolvedValue({});

      await AuditLogDAO.write(baseWriteInput);

      expect(AuditLogModel.create).toHaveBeenCalledWith(baseWriteInput);
    });

    it('includes optional fields when provided', async () => {
      (AuditLogModel.create as jest.Mock).mockResolvedValue({});

      const input = {
        ...baseWriteInput,
        before: { email: 'old@example.com' },
        after: { email: 'new@example.com' },
        metadata: { reason: 'policy violation' },
        ipAddress: '1.2.3.4',
      };

      await AuditLogDAO.write(input);

      expect(AuditLogModel.create).toHaveBeenCalledWith(input);
    });

    it('throws on database error', async () => {
      (AuditLogModel.create as jest.Mock).mockRejectedValue(new Error('db error'));

      await expect(AuditLogDAO.write(baseWriteInput)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  // ─── readPage ────────────────────────────────────────────────────────────────

  describe('readPage', () => {
    const mockEntry = {
      auditId: 'audit-1',
      actorId: 'user-1',
      actorRole: UserRole.Admin,
      action: AuditAction.USER_DELETED,
      targetType: AuditTargetType.User,
      targetId: 'user-2',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };

    it('returns items and hasMore=false when results fit within limit', async () => {
      (AuditLogModel.find as jest.Mock).mockReturnValue(createMockFindQuery([mockEntry]));

      const result = await AuditLogDAO.readPage({ limit: 25 });

      expect(result.items).toHaveLength(1);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it('returns hasMore=true and nextCursor when results exceed limit', async () => {
      const entries = Array.from({ length: 3 }, (_, i) => ({
        ...mockEntry,
        auditId: `audit-${i + 1}`,
        createdAt: new Date(`2026-01-0${3 - i}T00:00:00Z`),
      }));
      (AuditLogModel.find as jest.Mock).mockReturnValue(createMockFindQuery(entries));

      const result = await AuditLogDAO.readPage({ limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe(entries[1].createdAt.toISOString());
    });

    it('applies actorId filter', async () => {
      (AuditLogModel.find as jest.Mock).mockReturnValue(createMockFindQuery([]));

      await AuditLogDAO.readPage({ actorId: 'user-1' });

      expect(AuditLogModel.find).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'user-1' }));
    });

    it('applies action filter', async () => {
      (AuditLogModel.find as jest.Mock).mockReturnValue(createMockFindQuery([]));

      await AuditLogDAO.readPage({ action: AuditAction.ORG_DELETED });

      expect(AuditLogModel.find).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.ORG_DELETED }));
    });

    it('applies targetType filter', async () => {
      (AuditLogModel.find as jest.Mock).mockReturnValue(createMockFindQuery([]));

      await AuditLogDAO.readPage({ targetType: AuditTargetType.User });

      expect(AuditLogModel.find).toHaveBeenCalledWith(expect.objectContaining({ targetType: AuditTargetType.User }));
    });

    it('applies targetId filter', async () => {
      (AuditLogModel.find as jest.Mock).mockReturnValue(createMockFindQuery([]));

      await AuditLogDAO.readPage({ targetId: 'user-99' });

      expect(AuditLogModel.find).toHaveBeenCalledWith(expect.objectContaining({ targetId: 'user-99' }));
    });

    it('applies fromDate as lower bound on createdAt', async () => {
      (AuditLogModel.find as jest.Mock).mockReturnValue(createMockFindQuery([]));

      const fromDate = new Date('2026-01-01T00:00:00.000Z');
      await AuditLogDAO.readPage({ fromDate });

      expect(AuditLogModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ createdAt: expect.objectContaining({ $gte: fromDate }) }),
      );
    });

    it('applies toDate as upper bound on createdAt when no cursor is provided', async () => {
      (AuditLogModel.find as jest.Mock).mockReturnValue(createMockFindQuery([]));

      const toDate = new Date('2026-06-01T00:00:00.000Z');
      await AuditLogDAO.readPage({ toDate });

      expect(AuditLogModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ createdAt: expect.objectContaining({ $lt: toDate }) }),
      );
    });

    it('applies cursor as upper bound on createdAt', async () => {
      (AuditLogModel.find as jest.Mock).mockReturnValue(createMockFindQuery([]));

      const cursor = '2026-01-01T12:00:00.000Z';
      await AuditLogDAO.readPage({ cursor });

      expect(AuditLogModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ createdAt: { $lt: new Date(cursor) } }),
      );
    });

    it('caps limit at MAX_PAGE_LIMIT (100)', async () => {
      const findQuery = createMockFindQuery([]);
      (AuditLogModel.find as jest.Mock).mockReturnValue(findQuery);

      await AuditLogDAO.readPage({ limit: 999 });

      // limit + 1 passed to mongoose, capped at 101
      expect(findQuery.limit).toHaveBeenCalledWith(101);
    });

    it('throws on database error', async () => {
      (AuditLogModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('db error')),
      });

      await expect(AuditLogDAO.readPage({})).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });
});
