import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GradingWorkflowStatus } from '@prisma/client';

class AnnualGradeTermInputDto {
  @ApiProperty({ example: 'cmabc123term' })
  @IsString()
  academicTermId!: string;

  @ApiProperty({ example: 45.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  termTotal!: number;
}

export class CreateAnnualGradeDto {
  @ApiProperty({ example: 'cmabc123enrollment' })
  @IsString()
  studentEnrollmentId!: string;

  @ApiProperty({ example: 'cmabc123subject' })
  @IsString()
  subjectId!: string;

  @ApiProperty({ example: 'cmabc123year' })
  @IsString()
  academicYearId!: string;

  @ApiPropertyOptional({ example: 45.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  semester1Total?: number;

  @ApiPropertyOptional({ example: 44.25 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  semester2Total?: number;

  @ApiPropertyOptional({
    type: [AnnualGradeTermInputDto],
    description: 'تفاصيل مجموعات الفصول (اختياري عند استخدام أكثر من فصلين).',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnnualGradeTermInputDto)
  termTotals?: AnnualGradeTermInputDto[];

  @ApiPropertyOptional({ example: 89.75 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  annualPercentage?: number;

  @ApiProperty({ example: 'cmabc123statusPass' })
  @IsString()
  finalStatusId!: string;

  @ApiPropertyOptional({
    enum: GradingWorkflowStatus,
    example: GradingWorkflowStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(GradingWorkflowStatus)
  status?: GradingWorkflowStatus;

  @ApiPropertyOptional({
    example: 'Calculated after moderation committee review',
  })
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
