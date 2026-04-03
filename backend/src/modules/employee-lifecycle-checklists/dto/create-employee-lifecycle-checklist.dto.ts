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
import {
  EmployeeLifecycleChecklistType,
} from '@prisma/client';

export class CreateEmployeeLifecycleChecklistDto {
  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsString()
  employeeId!: string;

  @ApiProperty({
    enum: EmployeeLifecycleChecklistType,
    example: EmployeeLifecycleChecklistType.ONBOARDING,
  })
  @IsEnum(EmployeeLifecycleChecklistType)
  checklistType!: EmployeeLifecycleChecklistType;

  @ApiProperty({ example: 'تسليم البريد المؤسسي والبطاقة الوظيفية' })
  @IsString()
  @MaxLength(180)
  title!: string;

  @ApiPropertyOptional({ example: 'cmf2f32b60000uvh95h7tk7q2' })
  @IsOptional()
  @IsString()
  assignedToEmployeeId?: string;

  @ApiPropertyOptional({ example: '2026-04-05T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'تم التنسيق مع تقنية المعلومات.' })
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
