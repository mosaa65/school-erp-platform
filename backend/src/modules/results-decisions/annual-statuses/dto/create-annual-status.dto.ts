import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAnnualStatusDto {
  @ApiProperty({ example: 'PASS' })
  @IsString()
  @MaxLength(40)
  @Matches(/^[A-Z0-9_]+$/, {
    message:
      'code must contain only uppercase letters, numbers, or underscores',
  })
  code!: string;

  @ApiProperty({ example: 'Passed' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: 'Student passed this subject in annual total',
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
