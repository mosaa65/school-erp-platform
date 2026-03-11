import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GradingWorkflowStatus } from '@prisma/client';

export class UpdateMonthlyGradeDto {
  @ApiPropertyOptional({ example: 2.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  activityScore?: number;

  @ApiPropertyOptional({ example: 1.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  contributionScore?: number;

  @ApiPropertyOptional({
    enum: GradingWorkflowStatus,
    example: GradingWorkflowStatus.IN_REVIEW,
  })
  @IsOptional()
  @IsEnum(GradingWorkflowStatus)
  status?: GradingWorkflowStatus;

  @ApiPropertyOptional({ example: 'Updated after moderation' })
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
