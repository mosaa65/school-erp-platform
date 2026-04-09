import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordByCredentialsDto {
  @ApiProperty({ example: '+967772217218' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  @IsString()
  @MaxLength(191)
  loginId!: string;

  @ApiProperty({ example: 'Current#Strong!Pass2026' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  currentPassword!: string;

  @ApiProperty({ example: 'New#Stronger!Pass2026' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  newPassword!: string;

  @ApiProperty({ example: 'New#Stronger!Pass2026' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  confirmPassword!: string;
}
