import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeGender, EmploymentType } from '@prisma/client';

export class ListEmployeesDto {
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

  @ApiPropertyOptional({ example: 'ahmed' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: EmployeeGender })
  @IsOptional()
  @IsEnum(EmployeeGender)
  gender?: EmployeeGender;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  genderId?: number;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idTypeId?: number;

  @ApiPropertyOptional({ example: 'Teacher' })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qualificationId?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  jobRoleId?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
