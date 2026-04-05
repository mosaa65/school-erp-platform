import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AuditTrailAction } from '@prisma/client';

export class CreateAuditTrailDto {
  @ApiProperty({ example: 'revenues' })
  @IsString()
  @MaxLength(80)
  tableName!: string;

  @ApiProperty({ example: '12345' })
  @IsString()
  @MaxLength(30)
  recordId!: string;

  @ApiProperty({ enum: AuditTrailAction })
  @IsEnum(AuditTrailAction)
  action!: AuditTrailAction;

  @ApiPropertyOptional({ example: 'amount' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  fieldName?: string;

  @ApiPropertyOptional({ example: '1000.00' })
  @IsOptional()
  @IsString()
  oldValue?: string;

  @ApiPropertyOptional({ example: '1500.00' })
  @IsOptional()
  @IsString()
  newValue?: string;

  @ApiPropertyOptional({ example: 'Adjusted revenue amount after correction' })
  @IsOptional()
  @IsString()
  changeSummary?: string;
}
