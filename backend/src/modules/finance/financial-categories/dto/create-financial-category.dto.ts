import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { FinancialCategoryType } from '@prisma/client';

export class CreateFinancialCategoryDto {
  @ApiProperty({ example: 'Tuition Revenue' })
  @IsString()
  @MaxLength(100)
  nameAr!: string;

  @ApiProperty({ enum: FinancialCategoryType })
  @IsEnum(FinancialCategoryType)
  categoryType!: FinancialCategoryType;

  @ApiPropertyOptional({ example: 'REV_TUITION' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  coaAccountId?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
