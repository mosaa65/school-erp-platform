import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentGatewayType } from '@prisma/client';

export class CreatePaymentGatewayDto {
  @ApiProperty({ example: 'بوابة تجريبية داخلية' })
  @IsString()
  @MaxLength(50)
  nameAr!: string;

  @ApiProperty({ example: 'Internal Test Gateway' })
  @IsString()
  @MaxLength(50)
  nameEn!: string;

  @ApiProperty({ enum: PaymentGatewayType, example: PaymentGatewayType.ONLINE })
  @IsEnum(PaymentGatewayType)
  gatewayType!: PaymentGatewayType;

  @ApiPropertyOptional({ example: 'https://gateway.example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  apiEndpoint?: string;

  @ApiPropertyOptional({ example: 'merchant_123' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  merchantId?: string;

  @ApiPropertyOptional({ example: 1100, description: 'Settlement account CoA id' })
  @IsOptional()
  @IsInt()
  @Min(1)
  settlementAccountId?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
