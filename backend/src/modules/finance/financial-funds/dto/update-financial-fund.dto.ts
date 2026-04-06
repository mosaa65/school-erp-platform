import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { FinancialFundType } from '@prisma/client';

export class UpdateFinancialFundDto {
  @ApiPropertyOptional({ example: 'Main Fund' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameAr?: string;

  @ApiPropertyOptional({ enum: FinancialFundType })
  @IsOptional()
  @IsEnum(FinancialFundType)
  fundType?: FinancialFundType;

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
