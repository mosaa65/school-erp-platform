import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLookupGradeDescriptionDto {
  @ApiProperty({ example: 90 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  minPercentage!: number;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  maxPercentage!: number;

  @ApiProperty({ example: 'ممتاز' })
  @IsString()
  @MaxLength(100)
  nameAr!: string;

  @ApiPropertyOptional({ example: 'Excellent' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameEn?: string;

  @ApiPropertyOptional({ example: '#2ecc71' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^#([A-Fa-f0-9]{6})$/, {
    message: 'colorCode must be a valid hex color like #2ecc71',
  })
  colorCode?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @Max(999)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
