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

export class ListEmployeeSectionSupervisionsDto {
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

  @ApiPropertyOptional({ example: 'grade 1' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ example: 'cmf2f32b60000uvh95h7tk7q2' })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiPropertyOptional({ example: 'cmf2f32b60000uvh95h7tk7q3' })
  @IsOptional()
  @IsString()
  academicYearId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  canViewStudents?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  canManageHomeworks?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  canManageGrades?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
