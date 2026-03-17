import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GradingComponentCalculationMode } from '@prisma/client';

export class ListGradingPolicyComponentsDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ example: 'cmabc123policy' })
  @IsOptional()
  @IsString()
  gradingPolicyId?: string;

  @ApiPropertyOptional({ enum: GradingComponentCalculationMode })
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

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'اختبار' })
  @IsOptional()
  @IsString()
  search?: string;
}
