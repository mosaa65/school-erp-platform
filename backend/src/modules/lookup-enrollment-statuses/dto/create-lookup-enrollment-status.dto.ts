import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateLookupEnrollmentStatusDto {
  @ApiProperty({ example: 'PASSPORT' })
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_]+$/, {
    message:
      'code must contain only uppercase letters, numbers, or underscores',
  })
  code!: string;

  @ApiProperty({ example: 'جواز سفر' })
  @IsString()
  @MaxLength(100)
  nameAr!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
