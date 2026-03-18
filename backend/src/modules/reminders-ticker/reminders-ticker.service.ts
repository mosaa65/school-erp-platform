import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma, ReminderTicker } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateReminderTickerDto } from './dto/create-reminder-ticker.dto';
import { ListRemindersTickerDto } from './dto/list-reminders-ticker.dto';
import { UpdateReminderTickerDto } from './dto/update-reminder-ticker.dto';

const reminderTickerInclude: Prisma.ReminderTickerInclude = {
  createdBy: {
    select: {
      id: true,
      email: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      email: true,
    },
  },
};

@Injectable()
export class RemindersTickerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateReminderTickerDto, actorUserId: string) {
    this.ensureDateRange(payload.startDate, payload.endDate);

    const content = this.normalizeContent(payload.content);

    try {
      const item = await this.prisma.reminderTicker.create({
        data: {
          content,
          tickerType: payload.tickerType,
          isActive: payload.isActive ?? true,
          displayOrder: payload.displayOrder ?? 0,
          startDate: payload.startDate ? new Date(payload.startDate) : null,
          endDate: payload.endDate ? new Date(payload.endDate) : null,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: reminderTickerInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'REMINDER_TICKER_CREATE',
        resource: 'reminders-ticker',
        resourceId: String(item.id),
        details: {
          tickerType: item.tickerType,
          displayOrder: item.displayOrder,
        },
      });

      return item;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'REMINDER_TICKER_CREATE_FAILED',
        resource: 'reminders-ticker',
        status: AuditStatus.FAILURE,
        details: {
          tickerType: payload.tickerType,
          reason: this.extractErrorMessage(error),
        },
      });

      throw error;
    }
  }

  async findAll(query: ListRemindersTickerDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const deletedOnly = query.deletedOnly ?? false;

    const where: Prisma.ReminderTickerWhereInput = {
      deletedAt: deletedOnly ? { not: null } : null,
      tickerType: query.tickerType,
      isActive: deletedOnly ? undefined : query.isActive,
      OR: query.search ? [{ content: { contains: query.search } }] : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.reminderTicker.count({ where }),
      this.prisma.reminderTicker.findMany({
        where,
        include: reminderTickerInclude,
        orderBy: [
          {
            displayOrder: 'asc',
          },
          {
            createdAt: 'desc',
          },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const item = await this.prisma.reminderTicker.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: reminderTickerInclude,
    });

    if (!item) {
      throw new NotFoundException('Reminder ticker item not found');
    }

    return item;
  }

  async update(
    id: number,
    payload: UpdateReminderTickerDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureExists(id);

    const resolvedStartDate =
      payload.startDate ?? this.toDateOnly(existing.startDate);
    const resolvedEndDate =
      payload.endDate ?? this.toDateOnly(existing.endDate);

    this.ensureDateRange(resolvedStartDate, resolvedEndDate);

    const content =
      payload.content === undefined
        ? undefined
        : this.normalizeContent(payload.content);

    const item = await this.prisma.reminderTicker.update({
      where: { id },
      data: {
        content,
        tickerType: payload.tickerType,
        isActive: payload.isActive,
        displayOrder: payload.displayOrder,
        startDate:
          payload.startDate === undefined
            ? undefined
            : payload.startDate
              ? new Date(payload.startDate)
              : null,
        endDate:
          payload.endDate === undefined
            ? undefined
            : payload.endDate
              ? new Date(payload.endDate)
              : null,
        updatedById: actorUserId,
      },
      include: reminderTickerInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'REMINDER_TICKER_UPDATE',
      resource: 'reminders-ticker',
      resourceId: String(id),
      details: payload as Prisma.InputJsonValue,
    });

    return item;
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureExists(id);

    await this.prisma.reminderTicker.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'REMINDER_TICKER_DELETE',
      resource: 'reminders-ticker',
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureExists(id: number): Promise<ReminderTicker> {
    const item = await this.prisma.reminderTicker.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!item) {
      throw new NotFoundException('Reminder ticker item not found');
    }

    return item;
  }

  private normalizeContent(content: string): string {
    const normalized = content.trim();

    if (!normalized) {
      throw new BadRequestException('content cannot be empty');
    }

    return normalized;
  }

  private ensureDateRange(startDate?: string | null, endDate?: string | null) {
    if (!startDate || !endDate) {
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (end < start) {
      throw new BadRequestException(
        'endDate must be after or equal to startDate',
      );
    }
  }

  private toDateOnly(value?: Date | null): string | undefined {
    if (!value) {
      return undefined;
    }

    return value.toISOString().slice(0, 10);
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
