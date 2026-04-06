import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentMethod, PaymentTransactionStatus } from '@prisma/client';

export class CreatePaymentTransactionDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  gatewayId?: number;

  @ApiPropertyOptional({ example: 'cmabc123enrollment' })
  @IsOptional()
  @IsString()
  enrollmentId?: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @ApiPropertyOptional({ example: '78910' })
  @IsOptional()
  @IsString()
  installmentId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  currencyId?: number;

  @ApiProperty({ example: 1500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CARD })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ enum: PaymentTransactionStatus })
  @IsOptional()
  @IsEnum(PaymentTransactionStatus)
  status?: PaymentTransactionStatus;

  @ApiPropertyOptional({ example: '2026-03-12T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ example: 'RCPT-20260312-0001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  receiptNumber?: string;

  @ApiPropertyOptional({ example: 'gw_12345' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  gatewayTransactionId?: string;

  @ApiPropertyOptional({ example: 'ولي أمر الطالب' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  payerName?: string;

  @ApiPropertyOptional({ example: '777777777' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  payerPhone?: string;

  @ApiPropertyOptional({ example: 'Manual offline payment' })
  @IsOptional()
  @IsString()
  notes?: string;
}
