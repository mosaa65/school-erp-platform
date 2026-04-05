import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AuditTrailAction } from '@prisma/client';

export class ListAuditTrailDto {
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

  @ApiPropertyOptional({ example: 'revenues' })
  @IsOptional()
  @IsString()
  tableName?: string;

  @ApiPropertyOptional({ example: '12345' })
  @IsOptional()
  @IsString()
  recordId?: string;

  @ApiPropertyOptional({ enum: AuditTrailAction })
  @IsOptional()
  @IsEnum(AuditTrailAction)
  action?: AuditTrailAction;

  @ApiPropertyOptional({ example: 'user-id' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: 'amount' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
