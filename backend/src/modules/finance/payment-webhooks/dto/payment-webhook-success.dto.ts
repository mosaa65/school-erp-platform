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

export class PaymentWebhookSuccessDto {
  @ApiProperty({ example: 'cma123payment' })
  @IsString()
  @MaxLength(191)
  transactionId!: string;

  @ApiProperty({ example: 1500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ example: 'GW-TRX-1001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  gatewayTransactionId?: string;

  @ApiPropertyOptional({ example: '2026-03-16T06:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ example: 'RCPT-20260316-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  receiptNumber?: string;

  @ApiPropertyOptional({ example: 'ولي الأمر' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  payerName?: string;

  @ApiPropertyOptional({ example: '777777777' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  payerPhone?: string;

  @ApiPropertyOptional({ example: 'evt_123' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  eventId?: string;

  @ApiPropertyOptional({ example: 'idem_123' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;
}
