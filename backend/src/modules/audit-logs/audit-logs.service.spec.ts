import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuditStatus } from '@prisma/client';
import { AuditLogsService } from './audit-logs.service';
import { AuditRollbackMode } from './dto/rollback-audit-log.dto';

describe('AuditLogsService timeline', () => {
  const prismaMock = {
    auditLog: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    systemSetting: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    student: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let service: AuditLogsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuditLogsService(prismaMock as never);
  });

  it('returns maximum 10 items even when a larger limit is requested', async () => {
    prismaMock.auditLog.findFirst.mockResolvedValueOnce({
      id: 'audit-1',
      resource: 'students',
      resourceId: 'stu-1',
    });

    prismaMock.$transaction.mockImplementationOnce(async (operations) => {
      const [, findManyOperation] = operations;
      return [
        18,
        await findManyOperation,
      ];
    });

    prismaMock.auditLog.count.mockResolvedValue(18);
    prismaMock.auditLog.findMany.mockResolvedValue([
      {
        id: 'audit-3',
        actorUserId: 'user-1',
        action: 'STUDENT_UPDATE',
        resource: 'students',
        resourceId: 'stu-1',
        status: 'SUCCESS',
        ipAddress: '10.0.0.1',
        userAgent: 'Chrome',
        details: null,
        occurredAt: new Date('2026-04-12T10:00:00.000Z'),
        createdAt: new Date('2026-04-12T10:00:00.000Z'),
        updatedAt: new Date('2026-04-12T10:00:00.000Z'),
        actorUser: null,
      },
    ]);

    const result = await service.findTimelineByAuditLogId('audit-1', 50);

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
      }),
    );
    expect(result.limit).toBe(10);
    expect(result.total).toBe(18);
    expect(result.data[0]?.timelineOrder).toBe(1);
    expect(result.data[0]?.isLatest).toBe(true);
  });

  it('returns single-item timeline when resourceId is missing', async () => {
    prismaMock.auditLog.findFirst
      .mockResolvedValueOnce({
        id: 'audit-5',
        resource: 'auth/login',
        resourceId: null,
      })
      .mockResolvedValueOnce({
        id: 'audit-5',
        actorUserId: null,
        action: 'USER_LOGIN',
        resource: 'auth/login',
        resourceId: null,
        status: 'SUCCESS',
        ipAddress: null,
        userAgent: null,
        details: null,
        occurredAt: new Date('2026-04-12T11:00:00.000Z'),
        createdAt: new Date('2026-04-12T11:00:00.000Z'),
        updatedAt: new Date('2026-04-12T11:00:00.000Z'),
        actorUser: null,
      });

    const result = await service.findTimelineByAuditLogId('audit-5');

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe('audit-5');
  });

  it('throws when anchor audit log is missing', async () => {
    prismaMock.auditLog.findFirst.mockResolvedValueOnce(null);

    await expect(service.findTimelineByAuditLogId('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('fails PREVIOUS rollback when no previous item exists', async () => {
    prismaMock.auditLog.findFirst.mockResolvedValueOnce({
      id: 'audit-only',
      resource: 'students',
      resourceId: 'stu-77',
    });
    prismaMock.auditLog.count.mockResolvedValue(1);
    prismaMock.auditLog.findMany.mockResolvedValue([
      {
        id: 'audit-only',
        actorUserId: 'actor-1',
        action: 'STUDENT_UPDATE',
        resource: 'students',
        resourceId: 'stu-77',
        status: AuditStatus.SUCCESS,
        ipAddress: '10.0.0.7',
        userAgent: 'Chrome',
        details: {
          after: {
            fullName: 'Student 77',
          },
        },
        occurredAt: new Date('2026-04-12T12:00:00.000Z'),
        createdAt: new Date('2026-04-12T12:00:00.000Z'),
        updatedAt: new Date('2026-04-12T12:00:00.000Z'),
        actorUser: null,
      },
    ]);
    prismaMock.$transaction.mockImplementationOnce(async (operations) =>
      Promise.all(operations),
    );

    await expect(
      service.rollbackFromTimeline('audit-only', 'actor-1', {
        mode: AuditRollbackMode.PREVIOUS,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('applies TARGET rollback using timeline snapshot and writes rollback audit entry', async () => {
    prismaMock.auditLog.findFirst.mockResolvedValueOnce({
      id: 'audit-latest',
      resource: 'students',
      resourceId: 'stu-42',
    });
    prismaMock.auditLog.count.mockResolvedValue(2);
    prismaMock.auditLog.findMany.mockResolvedValue([
      {
        id: 'audit-latest',
        actorUserId: 'actor-2',
        action: 'STUDENT_UPDATE',
        resource: 'students',
        resourceId: 'stu-42',
        status: AuditStatus.SUCCESS,
        ipAddress: '10.0.0.8',
        userAgent: 'Edge',
        details: {
          before: {
            fullName: 'الاسم السابق',
          },
          after: {
            fullName: 'الاسم الحالي',
          },
        },
        occurredAt: new Date('2026-04-12T12:10:00.000Z'),
        createdAt: new Date('2026-04-12T12:10:00.000Z'),
        updatedAt: new Date('2026-04-12T12:10:00.000Z'),
        actorUser: null,
      },
      {
        id: 'audit-old',
        actorUserId: 'actor-1',
        action: 'STUDENT_UPDATE',
        resource: 'students',
        resourceId: 'stu-42',
        status: AuditStatus.SUCCESS,
        ipAddress: '10.0.0.5',
        userAgent: 'Chrome',
        details: {
          after: {
            id: 'stu-42',
            fullName: 'الاسم المستهدف للتراجع',
            isActive: true,
          },
        },
        occurredAt: new Date('2026-04-12T11:10:00.000Z'),
        createdAt: new Date('2026-04-12T11:10:00.000Z'),
        updatedAt: new Date('2026-04-12T11:10:00.000Z'),
        actorUser: null,
      },
    ]);
    prismaMock.$transaction.mockImplementationOnce(async (operations) =>
      Promise.all(operations),
    );
    prismaMock.student.findUnique.mockResolvedValueOnce({
      id: 'stu-42',
      fullName: 'الاسم الحالي',
      isActive: true,
    });
    prismaMock.student.update.mockResolvedValueOnce({
      id: 'stu-42',
      fullName: 'الاسم المستهدف للتراجع',
      isActive: true,
    });
    prismaMock.auditLog.create.mockResolvedValueOnce({
      id: 'rollback-audit-1',
      occurredAt: new Date('2026-04-12T12:20:00.000Z'),
    });

    const result = await service.rollbackFromTimeline('audit-latest', 'actor-9', {
      mode: AuditRollbackMode.TARGET,
      targetAuditLogId: 'audit-old',
    });

    expect(prismaMock.student.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'stu-42',
        },
        data: expect.objectContaining({
          fullName: 'الاسم المستهدف للتراجع',
          isActive: true,
        }),
      }),
    );
    expect(result.success).toBe(true);
    expect(result.mode).toBe(AuditRollbackMode.TARGET);
    expect(result.targetAuditLogId).toBe('audit-old');
    expect(result.rollbackAuditLogId).toBe('rollback-audit-1');
  });

  it('returns disabled retention policy when no setting is configured', async () => {
    prismaMock.systemSetting.findFirst.mockResolvedValueOnce(null);

    const result = await service.getRetentionPolicy();

    expect(result.settingKey).toBe('audit_logs_retention_days');
    expect(result.retentionDays).toBeNull();
    expect(result.autoDeleteEnabled).toBe(false);
  });

  it('updates retention policy and stores setting as number text', async () => {
    prismaMock.systemSetting.findFirst
      .mockResolvedValueOnce({
        settingValue: '90',
      })
      .mockResolvedValueOnce({
        settingValue: '180',
      });

    prismaMock.systemSetting.upsert.mockResolvedValueOnce({
      id: 27,
      settingValue: '180',
      updatedAt: new Date('2026-04-12T13:00:00.000Z'),
    });

    prismaMock.auditLog.create.mockResolvedValueOnce({
      id: 'audit-policy-1',
      occurredAt: new Date('2026-04-12T13:00:01.000Z'),
    });
    prismaMock.auditLog.findMany.mockResolvedValue([]);

    const result = await service.updateRetentionPolicy(
      {
        retentionDays: 180,
      },
      'actor-11',
    );

    expect(prismaMock.systemSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          settingKey: 'audit_logs_retention_days',
          settingValue: '180',
        }),
        update: expect.objectContaining({
          settingValue: '180',
        }),
      }),
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'AUDIT_LOG_RETENTION_POLICY_UPDATE',
          resource: 'audit-logs',
          resourceId: '27',
        }),
      }),
    );
    expect(result.retentionDays).toBe(180);
    expect(result.autoDeleteEnabled).toBe(true);
  });
});
