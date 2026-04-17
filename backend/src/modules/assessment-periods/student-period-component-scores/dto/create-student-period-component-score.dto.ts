import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStudentPeriodComponentScoreDto {
  @ApiProperty({ example: 'cmabc123result' })
  @IsString()
  studentPeriodResultId!: string;

  @ApiProperty({ example: 'cmabc123component' })
  @IsString()
  assessmentPeriodComponentId!: string;

  @ApiProperty({ example: 15 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999)
  rawScore!: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999)
  finalScore?: number;

  @ApiPropertyOptional({ example: 'مراجعة ورقية' })
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
