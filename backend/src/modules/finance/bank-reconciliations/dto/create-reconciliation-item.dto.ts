import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ReconciliationItemType } from '@prisma/client';

export class CreateReconciliationItemDto {
  @ApiPropertyOptional({ example: 'cmabc123transaction' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  transactionId?: string;

  @ApiPropertyOptional({ example: 'cmaje123entry' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  journalEntryId?: string;

  @ApiPropertyOptional({ example: 'BANK-REF-7788' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankReference?: string;

  @ApiProperty({ example: 1500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: ReconciliationItemType })
  @IsEnum(ReconciliationItemType)
  itemType!: ReconciliationItemType;

  @ApiPropertyOptional({ example: '2026-03-16T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  matchedAt?: string;
}
