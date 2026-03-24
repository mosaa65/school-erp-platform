import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, MaxLength, Min, MinLength } from 'class-validator';

export class PayrollJournalDto {
  @ApiProperty({ example: 3, description: 'Month number (1-12)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ example: 2026, description: 'Year (YYYY)' })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @ApiProperty({ example: 250000, description: 'Total salaries amount' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalSalaries!: number;

  @ApiPropertyOptional({ example: 15000, description: 'Total deductions' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalDeductions?: number;

  @ApiPropertyOptional({ example: 1, description: 'Branch ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchId?: number;

  @ApiPropertyOptional({ example: 'رواتب شهر مارس 2026', description: 'Description override' })
  @IsOptional()
  @MinLength(2)
  @MaxLength(255)
  description?: string;
}
