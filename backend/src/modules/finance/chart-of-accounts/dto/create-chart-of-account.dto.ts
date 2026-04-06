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
import { AccountType, NormalBalance } from '@prisma/client';

export class CreateChartOfAccountDto {
  @ApiProperty({ example: 'Cash' })
  @IsString()
  @MaxLength(150)
  nameAr!: string;

  @ApiPropertyOptional({ example: 'Cash Account' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nameEn?: string;

  @ApiProperty({ enum: AccountType })
  @IsEnum(AccountType)
  accountType!: AccountType;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isHeader?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBankAccount?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  defaultCurrencyId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchId?: number;

  @ApiPropertyOptional({ enum: NormalBalance })
  @IsOptional()
  @IsEnum(NormalBalance)
  normalBalance?: NormalBalance;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
