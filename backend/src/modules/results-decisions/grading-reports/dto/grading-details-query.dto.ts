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
import { GradingSummaryQueryDto } from './grading-summary-query.dto';

export class GradingDetailsQueryDto extends GradingSummaryQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 'أحمد' })
  @IsOptional()
  @IsString()
  search?: string;

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
