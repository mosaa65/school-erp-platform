import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHomeworkTypeDto {
  @ApiProperty({ example: 'HOMEWORK' })
  @IsString()
  @MaxLength(40)
  @Matches(/^[A-Z0-9_]+$/, {
    message:
      'code must contain only uppercase letters, numbers, or underscores',
  })
  code!: string;

  @ApiProperty({ example: 'Homework Assignment' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'Standard take-home assignment' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ example: false })
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
