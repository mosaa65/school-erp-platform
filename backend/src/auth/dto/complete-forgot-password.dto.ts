import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CompleteForgotPasswordDto {
  @ApiProperty({ example: 'cmforgotapproval123' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  @IsString()
  @MaxLength(191)
  requestId!: string;

  @ApiProperty({ example: '482913' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  @Matches(/^\d{6}$/)
  approvalCode!: string;

  @ApiProperty({ example: 'Strong#2026!Pass' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  newPassword!: string;

  @ApiProperty({ example: 'Strong#2026!Pass' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  confirmPassword!: string;

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
