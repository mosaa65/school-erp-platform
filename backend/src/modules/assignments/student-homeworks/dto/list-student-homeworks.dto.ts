import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListStudentHomeworksDto {
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

  @ApiPropertyOptional({ example: 'cmabc123homework' })
  @IsOptional()
  @IsString()
  homeworkId?: string;

  @ApiPropertyOptional({ example: 'cmabc123enrollment' })
  @IsOptional()
  @IsString()
  studentEnrollmentId?: string;

  @ApiPropertyOptional({ example: 'cmabc123student' })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ example: 'cmabc123year' })
  @IsOptional()
  @IsString()
  academicYearId?: string;

  @ApiPropertyOptional({ example: 'cmabc123section' })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiPropertyOptional({ example: 'cmabc123subject' })
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isCompleted?: boolean;

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  fromSubmittedAt?: string;

  @ApiPropertyOptional({ example: '2026-09-30T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  toSubmittedAt?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
