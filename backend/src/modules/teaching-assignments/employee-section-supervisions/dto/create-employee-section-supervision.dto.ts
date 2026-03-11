import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeSectionSupervisionDto {
  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsString()
  employeeId!: string;

  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q2' })
  @IsString()
  sectionId!: string;

  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q3' })
  @IsString()
  academicYearId!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  canViewStudents?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  canManageHomeworks?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  canManageGrades?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
