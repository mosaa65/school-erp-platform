import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ example: 'MAIN' })
  @IsString()
  @MaxLength(10)
  code!: string;

  @ApiProperty({ example: 'Main Branch' })
  @IsString()
  @MaxLength(100)
  nameAr!: string;

  @ApiPropertyOptional({ example: 'Head Office' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameEn?: string;

  @ApiPropertyOptional({ example: 'City center, Building 12' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '0111111111' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isHeadquarters?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
