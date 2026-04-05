import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { FinancialFundType } from '@prisma/client';

export class CreateFinancialFundDto {
  @ApiProperty({ example: 'Main Fund' })
  @IsString()
  @MaxLength(100)
  nameAr!: string;

  @ApiPropertyOptional({ example: 'MAIN_FUND' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

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
