import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  StudentGender,
  StudentHealthStatus,
  StudentOrphanStatus,
} from '@prisma/client';

export class CreateStudentDto {
  @ApiPropertyOptional({ example: 'STU-000123' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  admissionNo?: string;

  @ApiProperty({ example: 'Mohammed Ahmed Ali' })
  @IsString()
  @MaxLength(150)
  fullName!: string;

  @ApiProperty({ enum: StudentGender, example: StudentGender.MALE })
  @IsEnum(StudentGender)
  gender!: StudentGender;

  @ApiPropertyOptional({ example: '2014-05-10T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bloodTypeId?: number | null;

  @ApiPropertyOptional({
    enum: StudentHealthStatus,
    example: StudentHealthStatus.HEALTHY,
  })
  @IsOptional()
  @IsEnum(StudentHealthStatus)
  healthStatus?: StudentHealthStatus;

  @ApiPropertyOptional({ example: 'No chronic conditions' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  healthNotes?: string;

  @ApiPropertyOptional({
    enum: StudentOrphanStatus,
    example: StudentOrphanStatus.NONE,
  })
  @IsOptional()
  @IsEnum(StudentOrphanStatus)
  orphanStatus?: StudentOrphanStatus;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
