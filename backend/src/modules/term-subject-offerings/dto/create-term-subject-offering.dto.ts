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

export class CreateTermSubjectOfferingDto {
  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsString()
  academicTermId!: string;

  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q2' })
  @IsString()
  gradeLevelSubjectId!: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  weeklyPeriods?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  displayOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
