import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TimetableDay } from '@prisma/client';

export class UpdateTimetableEntryDto {
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

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  periodIndex?: number;

  @ApiPropertyOptional({ example: 'A-204' })
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MaxLength(80)
  roomLabel?: string;

  @ApiPropertyOptional({ example: 'Bring projector for visual explanations.' })
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MaxLength(255)
  notes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
