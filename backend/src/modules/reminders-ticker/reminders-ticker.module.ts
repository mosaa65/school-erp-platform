import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { RemindersTickerController } from './reminders-ticker.controller';
import { RemindersTickerService } from './reminders-ticker.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [RemindersTickerController],
  providers: [RemindersTickerService],
  exports: [RemindersTickerService],
})
export class RemindersTickerModule {}
