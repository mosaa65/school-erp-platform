import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  EmployeeLifecycleChecklistStatus,
  EmployeeLifecycleChecklistType,
} from '@prisma/client';

export class ListEmployeeLifecycleChecklistsDto {
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

  @ApiPropertyOptional({ example: 'بريد' })
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
  assignedToEmployeeId?: string;

  @ApiPropertyOptional({ enum: EmployeeLifecycleChecklistType })
  @IsOptional()
  @IsEnum(EmployeeLifecycleChecklistType)
  checklistType?: EmployeeLifecycleChecklistType;

  @ApiPropertyOptional({ enum: EmployeeLifecycleChecklistStatus })
  @IsOptional()
  @IsEnum(EmployeeLifecycleChecklistStatus)
  status?: EmployeeLifecycleChecklistStatus;

  @ApiPropertyOptional({ example: '2026-04-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiPropertyOptional({ example: '2026-04-30T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
