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
import { TimetableDay } from '@prisma/client';

export class CreateEmployeeTaskDto {
  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsString()
  employeeId!: string;

  @ApiPropertyOptional({ example: 'cmf2f32b60000uvh95h7tk7q2' })
  @IsOptional()
  @IsString()
  academicYearId?: string;

  @ApiProperty({ example: 'Morning Supervision' })
  @IsString()
  @MaxLength(120)
  taskName!: string;

  @ApiPropertyOptional({ enum: TimetableDay, example: TimetableDay.MONDAY })
  @IsOptional()
  @IsEnum(TimetableDay)
  dayOfWeek?: TimetableDay;

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  assignmentDate?: string;

  @ApiPropertyOptional({ example: 'Gate duty before first class.' })
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
