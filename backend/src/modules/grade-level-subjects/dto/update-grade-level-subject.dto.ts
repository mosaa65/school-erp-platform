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

export class UpdateGradeLevelSubjectDto {
  @ApiPropertyOptional({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsOptional()
  @IsString()
  academicYearId?: string;

  @ApiPropertyOptional({ example: 'cmf2f32b60000uvh95h7tk7q2' })
  @IsOptional()
  @IsString()
  gradeLevelId?: string;

  @ApiPropertyOptional({ example: 'cmf2f32b60000uvh95h7tk7q3' })
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isMandatory?: boolean;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  weeklyPeriods?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  displayOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
