import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReminderTickerType } from '@prisma/client';

export class CreateReminderTickerDto {
  @ApiProperty({ example: 'سبحان الله وبحمده، سبحان الله العظيم' })
  @IsString()
  @MaxLength(4000)
  content!: string;

  @ApiPropertyOptional({
    enum: ReminderTickerType,
    example: ReminderTickerType.DHIKR,
  })
  @IsOptional()
  @IsEnum(ReminderTickerType)
  tickerType?: ReminderTickerType;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(255)
  displayOrder?: number;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
