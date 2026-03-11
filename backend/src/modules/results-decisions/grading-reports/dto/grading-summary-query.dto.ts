import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class GradingSummaryQueryDto {
  @ApiPropertyOptional({ example: 'cmabc123year' })
  @IsOptional()
  @IsString()
  academicYearId?: string;

  @ApiPropertyOptional({ example: 'cmabc123grade' })
  @IsOptional()
  @IsString()
  gradeLevelId?: string;

  @ApiPropertyOptional({ example: 'cmabc123section' })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiPropertyOptional({ example: 'cmabc123term' })
  @IsOptional()
  @IsString()
  academicTermId?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
