import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EmployeeGender,
  EmployeeSystemAccessStatus,
  EmploymentType,
} from '@prisma/client';

export class CreateEmployeeDto {
  @ApiPropertyOptional({ example: 'EMP-0012' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  jobNumber?: string;

  @ApiPropertyOptional({ example: 'FIN-88991' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  financialNumber?: string;

  @ApiProperty({ example: 'Ahmed Ali Hassan' })
  @IsString()
  @MaxLength(150)
  fullName!: string;

  @ApiProperty({ enum: EmployeeGender, example: EmployeeGender.MALE })
  @IsEnum(EmployeeGender)
  gender!: EmployeeGender;

  @ApiPropertyOptional({ example: '1990-05-12T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ example: '+967777111222' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phonePrimary?: string;

  @ApiPropertyOptional({ example: '+967733444555' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneSecondary?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasWhatsapp?: boolean;

  @ApiPropertyOptional({ example: 'Bachelor of Education' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  qualification?: string;

  @ApiPropertyOptional({ example: '2014-07-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  qualificationDate?: string;

  @ApiPropertyOptional({ example: 'Mathematics' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialization?: string;

  @ApiPropertyOptional({ example: 'A123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  idNumber?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idTypeId?: number | null;

  @ApiPropertyOptional({ example: '2030-12-31T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  idExpiryDate?: string;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(80)
  experienceYears?: number;

  @ApiPropertyOptional({
    enum: EmploymentType,
    example: EmploymentType.PERMANENT,
  })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ example: 'Senior Arabic Teacher' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

  @ApiPropertyOptional({ example: '2020-09-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiPropertyOptional({ example: 'Al-Nour Private School' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  previousSchool?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  salaryApproved?: boolean;

  @ApiPropertyOptional({
    enum: EmployeeSystemAccessStatus,
    example: EmployeeSystemAccessStatus.GRANTED,
  })
  @IsOptional()
  @IsEnum(EmployeeSystemAccessStatus)
  systemAccessStatus?: EmployeeSystemAccessStatus;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
