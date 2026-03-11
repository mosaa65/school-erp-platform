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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TieBreakStrategy } from '@prisma/client';

export class CreateGradingOutcomeRuleDto {
  @ApiProperty({ example: 'cmabc123year' })
  @IsString()
  academicYearId!: string;

  @ApiProperty({ example: 'cmabc123grade' })
  @IsString()
  gradeLevelId!: string;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  promotedMaxFailedSubjects!: number;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  conditionalMaxFailedSubjects!: number;

  @ApiProperty({ example: 'cmabc123conditional' })
  @IsString()
  conditionalDecisionId!: string;

  @ApiProperty({ example: 'cmabc123retained' })
  @IsString()
  retainedDecisionId!: string;

  @ApiPropertyOptional({
    enum: TieBreakStrategy,
    example: TieBreakStrategy.PERCENTAGE_THEN_NAME,
  })
  @IsOptional()
  @IsEnum(TieBreakStrategy)
  tieBreakStrategy?: TieBreakStrategy;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
