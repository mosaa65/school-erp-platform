import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListStudentPeriodComponentScoresDto {
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

  @ApiPropertyOptional({ example: 'cmabc123result' })
  @IsOptional()
  @IsString()
  studentPeriodResultId?: string;

  @ApiPropertyOptional({ example: 'cmabc123component' })
  @IsOptional()
  @IsString()
  assessmentPeriodComponentId?: string;

  @ApiPropertyOptional({ example: 'cmabc123period' })
  @IsOptional()
  @IsString()
  assessmentPeriodId?: string;

  @ApiPropertyOptional({ example: 'cmabc123subject' })
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional({ example: 'cmabc123enrollment' })
  @IsOptional()
  @IsString()
  studentEnrollmentId?: string;

  @ApiPropertyOptional({ example: 'cmabc123student' })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
