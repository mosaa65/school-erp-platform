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
import { RevenueSourceType } from '@prisma/client';

export class CreateRevenueDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fundId!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId!: number;

  @ApiProperty({ example: 1500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ example: '2026-03-15' })
  @IsDateString()
  revenueDate!: string;

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
