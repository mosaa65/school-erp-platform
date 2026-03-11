import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssessmentType, GradingWorkflowStatus } from '@prisma/client';

export class CreateExamPeriodDto {
  @ApiProperty({ example: 'cmabc123year' })
  @IsString()
  academicYearId!: string;

  @ApiProperty({ example: 'cmabc123term' })
  @IsString()
  academicTermId!: string;

  @ApiProperty({ example: 'Monthly Exam - Muharram' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: AssessmentType, example: AssessmentType.MONTHLY })
  @IsEnum(AssessmentType)
  assessmentType!: AssessmentType;

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-09-07T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: GradingWorkflowStatus,
    example: GradingWorkflowStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(GradingWorkflowStatus)
  status?: GradingWorkflowStatus;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isLocked?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
