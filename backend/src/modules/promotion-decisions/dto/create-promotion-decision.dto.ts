import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePromotionDecisionDto {
  @ApiPropertyOptional({ example: 'PROMOTED' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(/^[A-Z0-9_]+$/, {
    message:
      'code must contain only uppercase letters, numbers, or underscores',
  })
  code?: string;

  @ApiProperty({ example: 'Promoted to next grade' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: 'Promoted without conditions based on annual outcome',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
