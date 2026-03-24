import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, MaxLength, Min } from 'class-validator';

export class DepreciationJournalDto {
  @ApiProperty({ example: 12000, description: 'Total depreciation amount' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ example: 1, description: 'Branch ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  branchId?: number;

  @ApiPropertyOptional({ example: 'قيد إهلاك شهري', description: 'Description' })
  @IsOptional()
  @MaxLength(255)
  description?: string;
}
