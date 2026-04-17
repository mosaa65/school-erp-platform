import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssessmentPeriodCategory, GradingWorkflowStatus } from '@prisma/client';

export class CreateAssessmentPeriodDto {
  @ApiProperty({ example: 'cmabc123year' })
  @IsString()
  academicYearId!: string;

  @ApiProperty({ enum: AssessmentPeriodCategory })
  @IsEnum(AssessmentPeriodCategory)
  category!: AssessmentPeriodCategory;

  @ApiPropertyOptional({ example: 'cmabc123term' })
  @IsOptional()
  @IsString()
  academicTermId?: string;

  @ApiPropertyOptional({ example: 'cmabc123month' })
  @IsOptional()
  @IsString()
  academicMonthId?: string;

  @ApiProperty({ example: 'نتيجة شهر محرم' })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sequence?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999)
  maxScore?: number;

  @ApiPropertyOptional({ enum: GradingWorkflowStatus })
  @IsOptional()
  @IsEnum(GradingWorkflowStatus)
  status?: GradingWorkflowStatus;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
