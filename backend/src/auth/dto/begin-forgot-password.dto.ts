import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class BeginForgotPasswordDto {
  @ApiProperty({ example: '+967772217218' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  @IsString()
  @MaxLength(191)
  loginId!: string;

  @ApiPropertyOptional({ example: 'web:5c8f-uuid' })
  @IsOptional()
  @Transform(({ value }: { value?: string }) => value?.trim() || undefined)
  @IsString()
  @MaxLength(191)
  deviceId?: string;

  @ApiPropertyOptional({ example: 'Android (ar-YE)' })
  @IsOptional()
  @Transform(({ value }: { value?: string }) => value?.trim() || undefined)
  @IsString()
  @MaxLength(191)
  deviceLabel?: string;
}
