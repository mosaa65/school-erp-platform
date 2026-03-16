import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTalentDto {
  @ApiProperty({ example: 'HANDWRITING' })
  @IsString()
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9_\-.]+$/)
  code!: string;

  @ApiProperty({ example: 'Handwriting' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'Excellent artistic handwriting' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
