import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeLeaveType } from '@prisma/client';

export class CreateEmployeeLeaveDto {
  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsString()
  employeeId!: string;

  @ApiProperty({ enum: EmployeeLeaveType, example: EmployeeLeaveType.ANNUAL })
  @IsEnum(EmployeeLeaveType)
  leaveType!: EmployeeLeaveType;

  @ApiProperty({ example: '2026-04-10T00:00:00.000Z' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-04-12T00:00:00.000Z' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({
    example: 'ظروف أسرية طارئة.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
