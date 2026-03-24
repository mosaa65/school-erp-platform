import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PaymentWebhooksService } from './payment-webhooks.service';
import { PaymentWebhookFailureDto } from './dto/payment-webhook-failure.dto';
import { PaymentWebhookRefundDto } from './dto/payment-webhook-refund.dto';
import { PaymentWebhookSuccessDto } from './dto/payment-webhook-success.dto';

@ApiTags('Webhooks - Payment')
@Controller('webhooks/payment')
export class PaymentWebhooksController {
  constructor(private readonly paymentWebhooksService: PaymentWebhooksService) {}

  @Post('success')
  @ApiOperation({ summary: 'Payment success webhook' })
  handleSuccess(@Body() payload: PaymentWebhookSuccessDto, @Req() req: Request) {
    return this.paymentWebhooksService.handleSuccess(payload, req);
  }

  @Post('failure')
  @ApiOperation({ summary: 'Payment failure webhook' })
  handleFailure(@Body() payload: PaymentWebhookFailureDto, @Req() req: Request) {
    return this.paymentWebhooksService.handleFailure(payload, req);
  }

  @Post('refund')
  @ApiOperation({ summary: 'Payment refund webhook' })
  handleRefund(@Body() payload: PaymentWebhookRefundDto, @Req() req: Request) {
    return this.paymentWebhooksService.handleRefund(payload, req);
  }
}
