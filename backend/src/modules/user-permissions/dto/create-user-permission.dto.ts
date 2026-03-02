import { Type } from 'class-transformer';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserPermissionDto {
  @ApiProperty({ example: 'cmabc123user' })
  @IsString()
  userId!: string;

  @ApiProperty({ example: 'cmabc123permission' })
  @IsString()
  permissionId!: string;

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

  @ApiProperty({
    example: 'Temporary direct access during accreditation period',
  })
  @IsString()
  grantReason!: string;

  @ApiPropertyOptional({ example: 'Approved by executive committee' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
