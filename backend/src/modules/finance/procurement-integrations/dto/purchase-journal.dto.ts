import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class PurchaseJournalDto {
  @ApiProperty({ example: 125000, description: 'Total purchase amount (including VAT if any)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  totalAmount!: number;

  @ApiPropertyOptional({ example: 5000, description: 'VAT amount (optional)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  vatAmount?: number;

  @ApiPropertyOptional({ example: 1, description: 'Branch ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  branchId?: number;

  @ApiPropertyOptional({ example: 'فاتورة مشتريات رقم 123', description: 'Description/notes' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
