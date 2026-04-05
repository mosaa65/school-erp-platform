import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { FiscalPeriodStatus, FiscalPeriodType } from '@prisma/client';

export class CreateFiscalPeriodDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fiscalYearId!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  periodNumber!: number;

  @ApiProperty({ example: 'Period 1' })
  @IsString()
  @MaxLength(50)
  nameAr!: string;

  @ApiPropertyOptional({ enum: FiscalPeriodType })
  @IsOptional()
  @IsEnum(FiscalPeriodType)
  periodType?: FiscalPeriodType;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-01-31' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ enum: FiscalPeriodStatus })
  @IsOptional()
  @IsEnum(FiscalPeriodStatus)
  status?: FiscalPeriodStatus;

  @ApiPropertyOptional({ example: 'Closed after final adjustments' })
  @IsOptional()
  @IsString()
  closeNotes?: string;

  @ApiPropertyOptional({ example: 'Reopen for audit corrections' })
  @IsOptional()
  @IsString()
  reopenReason?: string;

  @ApiPropertyOptional({ example: '2026-02-15' })
  @IsOptional()
  @IsDateString()
  reopenDeadline?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
