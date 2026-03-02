import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeTalentDto {
  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsString()
  employeeId!: string;

  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q2' })
  @IsString()
  talentId!: string;

  @ApiPropertyOptional({ example: 'Leads handwriting workshops' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
