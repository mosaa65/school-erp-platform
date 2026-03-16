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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TimetableDay } from '@prisma/client';

export class CreateTimetableEntryDto {
  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsString()
  academicTermId!: string;

  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q2' })
  @IsString()
  sectionId!: string;

  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q3' })
  @IsString()
  termSubjectOfferingId!: string;

  @ApiProperty({ enum: TimetableDay, example: TimetableDay.MONDAY })
  @IsEnum(TimetableDay)
  dayOfWeek!: TimetableDay;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  periodIndex!: number;

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
