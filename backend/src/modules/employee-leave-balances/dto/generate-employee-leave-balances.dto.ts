import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeLeaveType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateEmployeeLeaveBalancesDto {
  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  balanceYear!: number;

  @ApiPropertyOptional({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({
    enum: EmployeeLeaveType,
    example: EmployeeLeaveType.ANNUAL,
  })
  @IsOptional()
  @IsEnum(EmployeeLeaveType)
  leaveType?: EmployeeLeaveType;
}
