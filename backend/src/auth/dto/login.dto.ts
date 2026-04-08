import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiPropertyOptional({
    example: 'admin@school.local',
    description: 'Email address or phone number (with country code)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  loginId?: string;

  @ApiPropertyOptional({
    example: 'admin@school.local',
    description: 'Legacy compatibility field; prefer loginId',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(191)
  email?: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({
    example: 'web:chrome:9a58d845-babc-41f5-bd93-223fa2f3f9a2',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  deviceId?: string;

  @ApiPropertyOptional({ example: 'Chrome on Windows' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  deviceLabel?: string;

  @ApiPropertyOptional({
    example: '03AGdBq24....',
    description: 'Reserved for CAPTCHA integration',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  captchaToken?: string;
}
