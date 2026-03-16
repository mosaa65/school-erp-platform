import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentBookStatus } from '@prisma/client';

export class CreateStudentBookDto {
  @ApiProperty({ example: 'cmabc123enrollment' })
  @IsString()
  studentEnrollmentId!: string;

  @ApiProperty({ example: 'cmabc123subject' })
  @IsString()
  subjectId!: string;

  @ApiPropertyOptional({ example: 'PART_1' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bookPart?: string;

  @ApiProperty({ example: '2026-09-03T00:00:00.000Z' })
  @IsDateString()
  issuedDate!: string;

  @ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  returnedDate?: string;

  @ApiPropertyOptional({
    enum: StudentBookStatus,
    example: StudentBookStatus.ISSUED,
  })
  @IsOptional()
  @IsEnum(StudentBookStatus)
  status?: StudentBookStatus;

  @ApiPropertyOptional({ example: 'Received in good condition' })
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
