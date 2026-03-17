import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeTeachingAssignmentDto {
  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsString()
  employeeId!: string;

  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q2' })
  @IsString()
  sectionId!: string;

  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q3' })
  @IsString()
  subjectId!: string;

  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q4' })
  @IsString()
  academicYearId!: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  weeklyPeriods?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
