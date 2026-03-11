import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GradingComponentCalculationMode } from '@prisma/client';

export class UpdateGradingPolicyComponentDto {
  @ApiPropertyOptional({ example: 'ATTENDANCE' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ example: 'الحضور' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxScore?: number;

  @ApiPropertyOptional({
    enum: GradingComponentCalculationMode,
    example: GradingComponentCalculationMode.MANUAL,
  })
  @IsOptional()
  @IsEnum(GradingComponentCalculationMode)
  calculationMode?: GradingComponentCalculationMode;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeInMonthly?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeInSemester?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
