import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class TransportRevenueReportQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Branch ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  branchId?: number;

  @ApiPropertyOptional({ example: '2026-03-01', description: 'Invoice date from' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-03-31', description: 'Invoice date to' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
