import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TaxType } from '@prisma/client';

export class CreateTaxConfigurationDto {
  @ApiProperty({ example: 'ضريبة مخرجات 15%' })
  @IsString()
  @MaxLength(80)
  taxNameAr!: string;

  @ApiPropertyOptional({ example: 'VAT Output 15%' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  taxNameEn?: string;

  @ApiProperty({ example: 15 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  rate!: number;

  @ApiProperty({ enum: TaxType, example: TaxType.OUTPUT })
  @IsEnum(TaxType)
  taxType!: TaxType;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isInclusive?: boolean;

  @ApiPropertyOptional({ example: 4100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  outputGlAccountId?: number;

  @ApiPropertyOptional({ example: 2100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  inputGlAccountId?: number;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
