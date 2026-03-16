import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PerformanceRatingLevel } from '@prisma/client';

export class CreateEmployeePerformanceEvaluationDto {
  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsString()
  employeeId!: string;

  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q2' })
  @IsString()
  academicYearId!: string;

  @ApiProperty({ example: '2026-12-20T00:00:00.000Z' })
  @IsDateString()
  evaluationDate!: string;

  @ApiProperty({ example: 92 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  score!: number;

  @ApiPropertyOptional({
    enum: PerformanceRatingLevel,
    example: PerformanceRatingLevel.EXCELLENT,
  })
  @IsOptional()
  @IsEnum(PerformanceRatingLevel)
  ratingLevel?: PerformanceRatingLevel;

  @ApiPropertyOptional({ example: 'cmf2f32b60000uvh95h7tk7q3' })
  @IsOptional()
  @IsString()
  evaluatorEmployeeId?: string;

  @ApiPropertyOptional({ example: 'Strong classroom management.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  strengths?: string;

  @ApiPropertyOptional({ example: 'Needs better assessment planning.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  weaknesses?: string;

  @ApiPropertyOptional({ example: 'Complete advanced pedagogy training.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  recommendations?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
