import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkUpdateStudentHomeworkItemDto {
  @ApiPropertyOptional({ example: 'cmabc123studenthomework' })
  @IsOptional()
  @IsString()
  studentHomeworkId?: string;

  @ApiPropertyOptional({ example: 'cmabc123enrollment' })
  @IsOptional()
  @IsString()
  studentEnrollmentId?: string;

  @ApiProperty({ example: true })
  @Type(() => Boolean)
  @IsBoolean()
  isCompleted!: boolean;

  @ApiPropertyOptional({ example: '2026-09-13T09:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  submittedAt?: string;

  @ApiPropertyOptional({ example: 4.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  manualScore?: number;

  @ApiPropertyOptional({ example: 'تم التنفيذ مع نقص بسيط.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  teacherNotes?: string;
}

export class BulkUpdateStudentHomeworksDto {
  @ApiProperty({ example: 'cmabc123homework' })
  @IsString()
  homeworkId!: string;

  @ApiProperty({ type: [BulkUpdateStudentHomeworkItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateStudentHomeworkItemDto)
  items!: BulkUpdateStudentHomeworkItemDto[];
}
