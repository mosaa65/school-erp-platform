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
import { StudentAttendanceStatus } from '@prisma/client';

export class CreateStudentAttendanceDto {
  @ApiProperty({ example: 'cmabc123enrollment' })
  @IsString()
  studentEnrollmentId!: string;

  @ApiProperty({ example: '2026-09-02T00:00:00.000Z' })
  @IsDateString()
  attendanceDate!: string;

  @ApiProperty({
    enum: StudentAttendanceStatus,
    example: StudentAttendanceStatus.PRESENT,
  })
  @IsEnum(StudentAttendanceStatus)
  status!: StudentAttendanceStatus;

  @ApiPropertyOptional({ example: '2026-09-02T07:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  checkInAt?: string;

  @ApiPropertyOptional({ example: '2026-09-02T13:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  checkOutAt?: string;

  @ApiPropertyOptional({ example: 'Late by 8 minutes' })
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
