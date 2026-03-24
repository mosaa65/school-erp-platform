import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class DeductionJournalDto {
  @ApiProperty({ example: 'cmabc123emp', description: 'Employee ID' })
  @IsString()
  @MaxLength(191)
  employeeId!: string;

  @ApiProperty({ example: 1500, description: 'Deduction amount' })
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

  @ApiPropertyOptional({ example: 'خصم غياب', description: 'Reason/description' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
