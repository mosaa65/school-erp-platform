import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class GenerateTransportInvoicesDto {
  @ApiProperty({ example: 'cmabc123year', description: 'Academic year ID' })
  @IsString()
  @MaxLength(191)
  academicYearId!: string;

  @ApiProperty({ example: ['cmabc123enroll'], description: 'Enrollment IDs' })
  @IsArray()
  enrollmentIds!: string[];

  @ApiProperty({ example: 1200, description: 'Transport fee amount' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ example: 0, description: 'VAT rate percentage' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  vatRate?: number;

  @ApiPropertyOptional({ example: '2026-04-01', description: 'Invoice date' })
  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @ApiPropertyOptional({ example: '2026-04-30', description: 'Due date' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 1, description: 'Branch ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  branchId?: number;

  @ApiPropertyOptional({ example: 'رسوم نقل', description: 'Line description' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}
