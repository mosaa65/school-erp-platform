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
} from 'class-validator';
import { BankReconciliationStatus } from '@prisma/client';

export class CreateBankReconciliationDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  bankAccountId!: number;

  @ApiProperty({ example: '2026-03-15' })
  @IsDateString()
  statementDate!: string;

  @ApiPropertyOptional({ example: 'STMT-2026-03' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  statementReference?: string;

  @ApiProperty({ example: 25000.75 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  bankBalance!: number;

  @ApiProperty({ example: 24800.25 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  bookBalance!: number;

  @ApiPropertyOptional({ enum: BankReconciliationStatus })
  @IsOptional()
  @IsEnum(BankReconciliationStatus)
  status?: BankReconciliationStatus;

  @ApiPropertyOptional({ example: 'End of month reconciliation' })
  @IsOptional()
  @IsString()
  notes?: string;
}
