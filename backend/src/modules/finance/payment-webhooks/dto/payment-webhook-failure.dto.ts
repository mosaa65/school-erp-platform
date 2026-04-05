import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PaymentWebhookFailureDto {
  @ApiProperty({ example: 'cma123payment' })
  @IsString()
  @MaxLength(191)
  transactionId!: string;

  @ApiPropertyOptional({ example: 'Insufficient funds' })
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

  @ApiPropertyOptional({ example: 'evt_124' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  eventId?: string;

  @ApiPropertyOptional({ example: 'idem_124' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;
}
