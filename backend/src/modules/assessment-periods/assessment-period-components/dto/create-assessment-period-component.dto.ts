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
import { AssessmentComponentEntryMode } from '@prisma/client';

export class CreateAssessmentPeriodComponentDto {
  @ApiProperty({ example: 'cmabc123period' })
  @IsString()
  assessmentPeriodId!: string;

  @ApiPropertyOptional({ example: 'EXAM' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiProperty({ example: 'اختبار' })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ enum: AssessmentComponentEntryMode })
  @IsOptional()
  @IsEnum(AssessmentComponentEntryMode)
  entryMode?: AssessmentComponentEntryMode;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999)
  maxScore?: number;

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
  isRequired?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
