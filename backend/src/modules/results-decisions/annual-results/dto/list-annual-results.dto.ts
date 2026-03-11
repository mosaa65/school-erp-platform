import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GradingWorkflowStatus } from '@prisma/client';

export class ListAnnualResultsDto {
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
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 'ahmed' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'cmabc123year' })
  @IsOptional()
  @IsString()
  academicYearId?: string;

  @ApiPropertyOptional({ example: 'cmabc123grade' })
  @IsOptional()
  @IsString()
  gradeLevelId?: string;

  @ApiPropertyOptional({ example: 'cmabc123section' })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiPropertyOptional({ example: 'cmabc123enrollment' })
  @IsOptional()
  @IsString()
  studentEnrollmentId?: string;

  @ApiPropertyOptional({ example: 'cmabc123student' })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ example: 'cmabc123decision' })
  @IsOptional()
  @IsString()
  promotionDecisionId?: string;

  @ApiPropertyOptional({ enum: GradingWorkflowStatus })
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
