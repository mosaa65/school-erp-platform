import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeLeaveType } from '@prisma/client';

export class CreateEmployeeLeaveBalanceDto {
  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsString()
  employeeId!: string;

  @ApiProperty({ enum: EmployeeLeaveType, example: EmployeeLeaveType.ANNUAL })
  @IsEnum(EmployeeLeaveType)
  leaveType!: EmployeeLeaveType;

  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  balanceYear!: number;

  @ApiProperty({ example: 30 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  allocatedDays!: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  carriedForwardDays?: number;

  @ApiPropertyOptional({ example: -2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-365)
  @Max(365)
  manualAdjustmentDays?: number;

  @ApiPropertyOptional({ example: 'رصيد سنوي مع ترحيل من العام السابق.' })
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
