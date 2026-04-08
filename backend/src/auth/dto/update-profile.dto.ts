import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: '+967' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  phoneCountryCode?: string;

  @ApiPropertyOptional({ example: '712345678' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phoneNationalNumber?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  webAuthnRequired?: boolean;
}
