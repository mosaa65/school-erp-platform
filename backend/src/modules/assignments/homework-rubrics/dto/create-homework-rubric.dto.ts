import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HomeworkRubricCriterionDto } from './homework-rubric-criterion.dto';

export const HOMEWORK_RUBRIC_DIFFICULTIES = [
  'FOUNDATION',
  'BALANCED',
  'CHALLENGE',
] as const;

export type HomeworkRubricDifficulty =
  (typeof HOMEWORK_RUBRIC_DIFFICULTIES)[number];

export class CreateHomeworkRubricDto {
  @ApiPropertyOptional({ example: 'RUBRIC_ANALYSIS' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_]+$/, {
    message:
      'code must contain only uppercase letters, numbers, or underscores',
  })
  code?: string;

  @ApiProperty({ example: 'معيار تصحيح واجب التحليل' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'معيار مرن للواجبات التحليلية المتقدمة.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'cmabc123hwt' })
  @IsOptional()
  @IsString()
  homeworkTypeId?: string | null;

  @ApiPropertyOptional({ example: 'cmabc123subject' })
  @IsOptional()
  @IsString()
  subjectId?: string | null;

  @ApiPropertyOptional({ example: 'cmabc123grade' })
  @IsOptional()
  @IsString()
  gradeLevelId?: string | null;

  @ApiPropertyOptional({
    example: 'BALANCED',
    enum: HOMEWORK_RUBRIC_DIFFICULTIES,
  })
  @IsOptional()
  @IsString()
  @IsIn(HOMEWORK_RUBRIC_DIFFICULTIES)
  difficulty?: HomeworkRubricDifficulty;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  maxScore?: number;

  @ApiProperty({ type: [HomeworkRubricCriterionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HomeworkRubricCriterionDto)
  criteria!: HomeworkRubricCriterionDto[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
