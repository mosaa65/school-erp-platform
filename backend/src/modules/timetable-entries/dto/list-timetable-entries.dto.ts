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
import { TimetableDay } from '@prisma/client';

export class ListTimetableEntriesDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'math' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsOptional()
  @IsString()
  academicTermId?: string;

  @ApiPropertyOptional({ example: 'cmf2f32b60000uvh95h7tk7q2' })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiPropertyOptional({ example: 'cmf2f32b60000uvh95h7tk7q3' })
  @IsOptional()
  @IsString()
  termSubjectOfferingId?: string;

  @ApiPropertyOptional({ enum: TimetableDay, example: TimetableDay.MONDAY })
  @IsOptional()
  @IsEnum(TimetableDay)
  dayOfWeek?: TimetableDay;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
