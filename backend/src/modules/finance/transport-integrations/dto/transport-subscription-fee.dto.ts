import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class TransportSubscriptionFeeDto {
  @ApiProperty({ example: '12345', description: 'Invoice ID' })
  @IsString()
  @MaxLength(191)
  invoiceId!: string;

  @ApiProperty({ example: 800, description: 'Fee amount' })
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

  @ApiPropertyOptional({ example: 'رسوم نقل إضافية', description: 'Line description' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}
