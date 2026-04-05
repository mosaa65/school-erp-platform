import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class PaymentWebhookRefundDto {
  @ApiProperty({ example: 'cma123payment' })
  @IsString()
  @MaxLength(191)
  transactionId!: string;

  @ApiProperty({ example: 1500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ example: '2026-03-16T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  refundedAt?: string;

  @ApiPropertyOptional({ example: 'Refund requested' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;

  @ApiPropertyOptional({ example: 'GW-TRX-1001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  gatewayTransactionId?: string;

  @ApiPropertyOptional({ example: 'ONLINE_GW' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  providerCode?: string;

  @ApiPropertyOptional({ example: 'evt_125' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  eventId?: string;

  @ApiPropertyOptional({ example: 'idem_125' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;
}
