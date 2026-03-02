import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentEnrollmentStatus } from '@prisma/client';

export class CreateStudentEnrollmentDto {
  @ApiProperty({ example: 'cmabc123student' })
  @IsString()
  studentId!: string;

  @ApiProperty({ example: 'cmabc123year' })
  @IsString()
  academicYearId!: string;

  @ApiProperty({ example: 'cmabc123section' })
  @IsString()
  sectionId!: string;

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  enrollmentDate?: string;

  @ApiPropertyOptional({
    enum: StudentEnrollmentStatus,
    example: StudentEnrollmentStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(StudentEnrollmentStatus)
  status?: StudentEnrollmentStatus;

  @ApiPropertyOptional({ example: 'Transferred from another school' })
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
