import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GradingWorkflowStatus } from '@prisma/client';

export class CreateStudentPeriodResultDto {
  @ApiProperty({ example: 'cmabc123period' })
  @IsString()
  assessmentPeriodId!: string;

  @ApiProperty({ example: 'cmabc123enrollment' })
  @IsString()
  studentEnrollmentId!: string;

  @ApiProperty({ example: 'cmabc123subject' })
  @IsString()
  subjectId!: string;

  @ApiPropertyOptional({ example: 'cmabc123tso' })
  @IsOptional()
  @IsString()
  termSubjectOfferingId?: string;

  @ApiPropertyOptional({ enum: GradingWorkflowStatus })
  @IsOptional()
  @IsEnum(GradingWorkflowStatus)
  status?: GradingWorkflowStatus;

  @ApiPropertyOptional({ example: 'تم إدخال الدرجة يدويًا' })
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
