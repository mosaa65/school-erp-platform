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
import { ViolationSeverity } from '@prisma/client';

export class CreateEmployeeViolationDto {
  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsString()
  employeeId!: string;

  @ApiProperty({ example: '2026-11-10T00:00:00.000Z' })
  @IsDateString()
  violationDate!: string;

  @ApiProperty({ example: 'Late arrival' })
  @IsString()
  @MaxLength(100)
  violationAspect!: string;

  @ApiProperty({ example: 'Employee arrived 20 minutes late without notice.' })
  @IsString()
  @MaxLength(1000)
  violationText!: string;

  @ApiPropertyOptional({ example: 'Written warning issued.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  actionTaken?: string;

  @ApiPropertyOptional({
    enum: ViolationSeverity,
    example: ViolationSeverity.MEDIUM,
  })
  @IsOptional()
  @IsEnum(ViolationSeverity)
  severity?: ViolationSeverity;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasWarning?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasMinutes?: boolean;

  @ApiPropertyOptional({ example: 'cmf2f32b60000uvh95h7tk7q2' })
  @IsOptional()
  @IsString()
  reportedByEmployeeId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
