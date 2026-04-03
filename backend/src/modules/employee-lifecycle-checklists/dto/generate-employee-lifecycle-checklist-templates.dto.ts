import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeLifecycleChecklistType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GenerateEmployeeLifecycleChecklistTemplatesDto {
  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsString()
  employeeId!: string;

  @ApiProperty({
    enum: EmployeeLifecycleChecklistType,
    example: EmployeeLifecycleChecklistType.ONBOARDING,
  })
  @IsEnum(EmployeeLifecycleChecklistType)
  checklistType!: EmployeeLifecycleChecklistType;

  @ApiPropertyOptional({ example: 'cmf2f32b60000uvh95h7tk7q2' })
  @IsOptional()
  @IsString()
  assignedToEmployeeId?: string;
}
