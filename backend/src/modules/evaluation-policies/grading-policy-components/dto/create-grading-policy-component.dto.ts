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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GradingComponentCalculationMode } from '@prisma/client';

export class CreateGradingPolicyComponentDto {
  @ApiProperty({ example: 'cmabc123policy' })
  @IsString()
  gradingPolicyId!: string;

  @ApiPropertyOptional({ example: 'ATTENDANCE' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiProperty({ example: 'الحضور' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxScore!: number;

  @ApiProperty({
    enum: GradingComponentCalculationMode,
    example: GradingComponentCalculationMode.MANUAL,
  })
  @IsEnum(GradingComponentCalculationMode)
  calculationMode!: GradingComponentCalculationMode;

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
