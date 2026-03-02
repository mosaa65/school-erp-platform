import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSchoolProfileDto {
  @ApiProperty({ example: 'default_school' })
  @IsString()
  @MaxLength(40)
  @Matches(/^[a-z0-9_-]+$/, {
    message:
      'code must contain only lowercase letters, numbers, underscores, or hyphens',
  })
  code!: string;

  @ApiProperty({ example: 'مدرسة النجاح' })
  @IsString()
  @MaxLength(150)
  nameAr!: string;

  @ApiPropertyOptional({ example: 'Al-Najah School' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nameEn?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ownershipTypeId?: number;

  @ApiPropertyOptional({ example: '+967777111222' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'info@school.local' })
  @IsOptional()
  @IsEmail()
  @MaxLength(191)
  email?: string;

  @ApiPropertyOptional({ example: "Sana'a - District 1" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressText?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
