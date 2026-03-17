import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssessmentType, GradingWorkflowStatus } from '@prisma/client';

export class CreateGradingPolicyDto {
  @ApiProperty({ example: 'cmabc123year' })
  @IsString()
  academicYearId!: string;

  @ApiProperty({ example: 'cmabc123grade' })
  @IsString()
  gradeLevelId!: string;

  @ApiProperty({ example: 'cmabc123subject' })
  @IsString()
  subjectId!: string;

  @ApiProperty({ enum: AssessmentType, example: AssessmentType.MONTHLY })
  @IsEnum(AssessmentType)
  assessmentType!: AssessmentType;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxExamScore?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxHomeworkScore?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxAttendanceScore?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxActivityScore?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxContributionScore?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  passingScore?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    enum: GradingWorkflowStatus,
    example: GradingWorkflowStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(GradingWorkflowStatus)
  status?: GradingWorkflowStatus;

  @ApiPropertyOptional({ example: 'Policy for monthly assessments' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
