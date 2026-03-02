import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExamAssessmentDto {
  @ApiProperty({ example: 'cmabc123period' })
  @IsString()
  examPeriodId!: string;

  @ApiProperty({ example: 'cmabc123section' })
  @IsString()
  sectionId!: string;

  @ApiProperty({ example: 'cmabc123subject' })
  @IsString()
  subjectId!: string;

  @ApiProperty({ example: 'Monthly Math Exam 1' })
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: '2026-09-03T08:00:00.000Z' })
  @IsDateString()
  examDate!: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  maxScore?: number;

  @ApiPropertyOptional({ example: 'Paper-based in room A1' })
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
