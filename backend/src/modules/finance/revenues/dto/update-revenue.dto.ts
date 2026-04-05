import { ApiPropertyOptional } from '@nestjs/swagger';
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
import { RevenueSourceType } from '@prisma/client';

export class UpdateRevenueDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fundId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ example: '2026-03-15' })
  @IsOptional()
  @IsDateString()
  revenueDate?: string;

  @ApiPropertyOptional({ enum: RevenueSourceType })
  @IsOptional()
  @IsEnum(RevenueSourceType)
  sourceType?: RevenueSourceType;

  @ApiPropertyOptional({ example: 'student-id' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  sourceId?: string;

  @ApiPropertyOptional({ example: 'RCPT-2026-0001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  receiptNumber?: string;

  @ApiPropertyOptional({ example: 'Manual revenue entry' })
  @IsOptional()
  @IsString()
  description?: string;
}
