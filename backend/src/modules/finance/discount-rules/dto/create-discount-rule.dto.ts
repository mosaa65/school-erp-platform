import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  DiscountAppliesToFeeType,
  DiscountCalculationMethod,
  DiscountType,
} from '@prisma/client';

export class CreateDiscountRuleDto {
  @ApiProperty({ example: 'خصم الإخوة' })
  @IsString()
  @MaxLength(100)
  nameAr!: string;

  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @ApiProperty({ enum: DiscountCalculationMethod })
  @IsEnum(DiscountCalculationMethod)
  calculationMethod!: DiscountCalculationMethod;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value!: number;

  @ApiProperty({ enum: DiscountAppliesToFeeType })
  @IsEnum(DiscountAppliesToFeeType)
  appliesToFeeType!: DiscountAppliesToFeeType;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  siblingOrderFrom?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxDiscountPercentage?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ example: 4100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  discountGlAccountId?: number;

  @ApiPropertyOptional({ example: 2100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  contraGlAccountId?: number;

  @ApiPropertyOptional({ example: 'cmabc123year' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  academicYearId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
