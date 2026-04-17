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
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  EnrollmentDistributionStatus,
  StudentEnrollmentStatus,
} from '@prisma/client';

export enum StudentEnrollmentSortBy {
  ACADEMIC_YEAR_START_DATE = 'ACADEMIC_YEAR_START_DATE',
  ENROLLMENT_DATE = 'ENROLLMENT_DATE',
  STUDENT_NAME = 'STUDENT_NAME',
  ADMISSION_NO = 'ADMISSION_NO',
  YEARLY_ENROLLMENT_NO = 'YEARLY_ENROLLMENT_NO',
  GRADE_LEVEL = 'GRADE_LEVEL',
  SECTION_NAME = 'SECTION_NAME',
  STATUS = 'STATUS',
  DISTRIBUTION_STATUS = 'DISTRIBUTION_STATUS',
  ACTIVE_STATE = 'ACTIVE_STATE',
  CREATED_AT = 'CREATED_AT',
  UPDATED_AT = 'UPDATED_AT',
}

export enum StudentEnrollmentSortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListStudentEnrollmentsDto {
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

  @ApiPropertyOptional({ example: 'mohammed' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'cmabc123student' })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ example: 'cmabc123year' })
  @IsOptional()
  @IsString()
  academicYearId?: string;

  @ApiPropertyOptional({ example: 'cmabc123grade' })
  @IsOptional()
  @IsString()
  gradeLevelId?: string;

  @ApiPropertyOptional({ example: 'cmabc123section' })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiPropertyOptional({ enum: StudentEnrollmentStatus })
  @IsOptional()
  @IsEnum(StudentEnrollmentStatus)
  status?: StudentEnrollmentStatus;

  @ApiPropertyOptional({ enum: EnrollmentDistributionStatus })
  @IsOptional()
  @IsEnum(EnrollmentDistributionStatus)
  distributionStatus?: EnrollmentDistributionStatus;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 'ACADEMIC_YEAR_START_DATE,STUDENT_NAME,GRADE_LEVEL',
    description: 'Comma-separated sort fields ordered by priority.',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    example: 'desc,asc,asc',
    description: 'Comma-separated sort directions matching sortBy priority.',
  })
  @IsOptional()
  @IsString()
  sortDirection?: string;
}
