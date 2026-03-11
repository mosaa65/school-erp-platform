import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMonthlyCustomComponentScoreDto {
  @ApiProperty({ example: 'cmabc123monthlygrade' })
  @IsString()
  monthlyGradeId!: string;

  @ApiProperty({ example: 'cmabc123component' })
  @IsString()
  gradingPolicyComponentId!: string;

  @ApiProperty({ example: 1.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  score!: number;

  @ApiPropertyOptional({ example: 'Participation quality' })
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
