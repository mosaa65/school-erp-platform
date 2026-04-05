import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class BulkGenerateInvoicesDto {
  @ApiProperty({ example: 'cmabc123year', description: 'Academic year ID' })
  @IsString()
  @MaxLength(191)
  academicYearId!: string;

  @ApiPropertyOptional({ example: 'grade-level-id', description: 'Filter by grade level' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  gradeLevelId?: string;

  @ApiPropertyOptional({ example: 1, description: 'Filter by branch' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchId?: number;

  @ApiPropertyOptional({ example: 3, description: 'Number of installments (default: 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  installmentCount?: number;

  @ApiPropertyOptional({ example: '2026-04-01', description: 'Invoice date (default: today)' })
  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @ApiPropertyOptional({ example: '2026-06-30', description: 'Due date for the invoice' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: true, description: 'Apply sibling discounts automatically' })
  @IsOptional()
  applySiblingDiscount?: boolean;
}
