import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeContractDto {
  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsString()
  employeeId!: string;

  @ApiProperty({ example: 'عقد معلم رياضيات - الفصل الأول' })
  @IsString()
  @MaxLength(150)
  contractTitle!: string;

  @ApiPropertyOptional({ example: 'CNT-2026-001' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  contractNumber?: string;

  @ApiProperty({ example: '2026-09-01T00:00:00.000Z' })
  @IsDateString()
  contractStartDate!: string;

  @ApiPropertyOptional({ example: '2027-06-30T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  contractEndDate?: string;

  @ApiPropertyOptional({ example: '120000.00' })
  @IsOptional()
  @IsNumberString()
  salaryAmount?: string;

  @ApiPropertyOptional({
    example: 'عقد قابل للتجديد وفق تقييم الأداء والاحتياج.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isCurrent?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
