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
import { EmployeeAttendanceStatus } from '@prisma/client';

export class CreateEmployeeAttendanceDto {
  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsString()
  employeeId!: string;

  @ApiProperty({ example: '2026-09-02T00:00:00.000Z' })
  @IsDateString()
  attendanceDate!: string;

  @ApiProperty({
    enum: EmployeeAttendanceStatus,
    example: EmployeeAttendanceStatus.PRESENT,
  })
  @IsEnum(EmployeeAttendanceStatus)
  status!: EmployeeAttendanceStatus;

  @ApiPropertyOptional({ example: '2026-09-02T07:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  checkInAt?: string;

  @ApiPropertyOptional({ example: '2026-09-02T14:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  checkOutAt?: string;

  @ApiPropertyOptional({ example: 'Late by 10 minutes.' })
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
