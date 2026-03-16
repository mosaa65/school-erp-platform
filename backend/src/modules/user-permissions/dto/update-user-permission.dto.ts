import { Type } from 'class-transformer';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserPermissionDto {
  @ApiPropertyOptional({ example: '2026-03-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ example: '2026-06-30T23:59:59.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({
    example: 'Renewed direct access for second audit cycle',
  })
  @IsOptional()
  @IsString()
  grantReason?: string;

  @ApiPropertyOptional({ example: 'Scope limited to read-only operations' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
