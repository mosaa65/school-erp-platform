import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class TransportMaintenanceExpenseDto {
  @ApiProperty({ example: 2500, description: 'Maintenance cost' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ example: 1, description: 'Branch ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  branchId?: number;

  @ApiPropertyOptional({ enum: PaymentMethod, description: 'Payment method' })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'صيانة باص', description: 'Description' })
  @IsOptional()
  @MaxLength(255)
  description?: string;
}
