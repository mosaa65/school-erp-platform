import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListCommunityContributionsDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ example: 'parent' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'enrollment-id' })
  @IsOptional()
  @IsString()
  enrollmentId?: string;

  @ApiPropertyOptional({ example: 'academic-year-id' })
  @IsOptional()
  @IsString()
  academicYearId?: string;

  @ApiPropertyOptional({ example: 'term-id' })
  @IsOptional()
  @IsString()
  semesterId?: string;

  @ApiPropertyOptional({ example: 'month-id' })
  @IsOptional()
  @IsString()
  monthId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  requiredAmountId?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isExempt?: boolean;

  @ApiPropertyOptional({ example: 'employee-id' })
  @IsOptional()
  @IsString()
  recipientEmployeeId?: string;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
