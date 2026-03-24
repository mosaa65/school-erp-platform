import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { RecurringJournalsService } from './recurring-journals.service';

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;
const MIN_INTERVAL_MS = 60 * 1000;

@Injectable()
export class RecurringJournalsSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RecurringJournalsSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly recurringJournalsService: RecurringJournalsService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const intervalMs = this.resolveInterval();
    this.timer = setInterval(() => {
      void this.runCycle();
    }, intervalMs);

    void this.runCycle();
    this.logger.log(`Recurring journal scheduler started (interval ${intervalMs}ms)`);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private resolveInterval() {
    const configured = Number(
      this.configService.get<string>('RECURRING_JOURNAL_INTERVAL_MS'),
    );

    if (Number.isFinite(configured) && configured >= MIN_INTERVAL_MS) {
      return configured;
    }

    return DEFAULT_INTERVAL_MS;
  }

  private async runCycle() {
    if (this.running) {
      return;
    }

    const actorUserId = this.configService.get<string>('FINANCE_SYSTEM_USER_ID');
    if (!actorUserId) {
      this.logger.warn(
        'FINANCE_SYSTEM_USER_ID is not configured; skipping recurring journal scheduler run.',
      );
      return;
    }

    this.running = true;
    const now = new Date();

    try {
      const dueTemplates = await this.prisma.recurringJournalTemplate.findMany({
        where: {
          isActive: true,
          nextRunDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
        select: { id: true, nextRunDate: true },
        orderBy: { nextRunDate: 'asc' },
        take: 50,
      });

      if (!dueTemplates.length) {
        return;
      }

      let successCount = 0;

      for (const template of dueTemplates) {
        try {
          await this.recurringJournalsService.generate(template.id, actorUserId);
          successCount += 1;
        } catch (error) {
          this.logger.error(
            `Failed to generate recurring journal for template ${template.id}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }

      if (successCount > 0) {
        this.logger.log(`Generated ${successCount} recurring journal entries.`);
      }
    } finally {
      this.running = false;
    }
  }
}
