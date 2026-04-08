import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class WebAuthnAuthenticationVerifyDto {
  @ApiProperty({
    example: 'cm9jw4kln0000dr2q4xv4d4o9',
  })
  @IsString()
  @MaxLength(191)
  challengeId!: string;

  @ApiProperty({
    description: 'Authentication response payload from @simplewebauthn/browser',
    type: Object,
  })
  @IsObject()
  response!: Record<string, unknown>;

  @ApiPropertyOptional({
    example: 'web:chrome:9a58d845-babc-41f5-bd93-223fa2f3f9a2',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  deviceId?: string;

  @ApiPropertyOptional({
    example: 'Chrome on Windows',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  deviceLabel?: string;
}