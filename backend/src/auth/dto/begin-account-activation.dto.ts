import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class BeginAccountActivationDto {
  @ApiProperty({ example: '+967772217218' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MaxLength(191)
  loginId!: string;

  @ApiProperty({ example: 'TempOneTime123' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({ example: 'VeryStrongPassword123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;

  @ApiProperty({ example: 'VeryStrongPassword123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  confirmPassword!: string;

  @ApiPropertyOptional({ example: 'web:device-123' })
  @IsOptional()
  @Transform(({ value }: { value?: string }) => value?.trim())
  @IsString()
  @MaxLength(191)
  deviceId?: string;

  @ApiPropertyOptional({ example: 'Windows (ar-YE)' })
  @IsOptional()
  @Transform(({ value }: { value?: string }) => value?.trim())
  @IsString()
  @MaxLength(191)
  deviceLabel?: string;
}
