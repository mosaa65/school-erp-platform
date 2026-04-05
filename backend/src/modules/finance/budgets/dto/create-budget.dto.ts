import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { BudgetType } from '@prisma/client';

export class BudgetLineInputDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  accountId!: number;

  @ApiPropertyOptional({ example: 'رواتب الموظفين' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  lineDescription?: string;

  @ApiProperty({ example: 50000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  budgetedAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}

export class CreateBudgetDto {
  @ApiProperty({ example: 'ميزانية العام الدراسي 2026' })
  @IsString()
  @MaxLength(100)
  nameAr!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fiscalYearId!: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchId?: number;

  @ApiPropertyOptional({ enum: BudgetType })
  @IsOptional()
  @IsEnum(BudgetType)
  budgetType?: BudgetType;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [BudgetLineInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetLineInputDto)
  lines!: BudgetLineInputDto[];
}
