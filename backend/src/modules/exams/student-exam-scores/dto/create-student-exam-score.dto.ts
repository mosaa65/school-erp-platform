import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamAbsenceType } from '@prisma/client';

export class CreateStudentExamScoreDto {
  @ApiProperty({ example: 'cmabc123assessment' })
  @IsString()
  examAssessmentId!: string;

  @ApiProperty({ example: 'cmabc123enrollment' })
  @IsString()
  studentEnrollmentId!: string;

  @ApiPropertyOptional({ example: 18.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  score?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPresent?: boolean;

  @ApiPropertyOptional({
    enum: ExamAbsenceType,
    example: ExamAbsenceType.EXCUSED,
  })
  @IsOptional()
  @IsEnum(ExamAbsenceType)
  absenceType?: ExamAbsenceType;

  @ApiPropertyOptional({ example: 'Medical leave' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  excuseDetails?: string;

  @ApiPropertyOptional({ example: 'Needs improvement in problem-solving' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  teacherNotes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
