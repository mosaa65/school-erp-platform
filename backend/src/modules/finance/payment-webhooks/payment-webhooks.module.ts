import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { PaymentWebhooksController } from './payment-webhooks.controller';
import { PaymentWebhooksService } from './payment-webhooks.service';

@Module({
  imports: [AuditLogsModule, ConfigModule],
  controllers: [PaymentWebhooksController],
  providers: [PaymentWebhooksService],
})
export class PaymentWebhooksModule {}
