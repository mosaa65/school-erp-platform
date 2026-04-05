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
import { FeeType } from '@prisma/client';

export class CreateFeeStructureDto {
  @ApiProperty({ example: 'cmabc123year' })
  @IsString()
  @MaxLength(191)
  academicYearId!: string;

  @ApiPropertyOptional({ example: 'cmabc123grade' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  gradeLevelId?: string;

  @ApiProperty({ enum: FeeType })
  @IsEnum(FeeType)
  feeType!: FeeType;

  @ApiProperty({ example: 'رسوم دراسية' })
  @IsString()
  @MaxLength(100)
  nameAr!: string;

  @ApiProperty({ example: 1500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currencyId?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  vatRate?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
