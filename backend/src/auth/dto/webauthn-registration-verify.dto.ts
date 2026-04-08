import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class WebAuthnRegistrationVerifyDto {
  @ApiProperty({
    example: 'cm9jw4kln0000dr2q4xv4d4o9',
  })
  @IsString()
  @MaxLength(191)
  challengeId!: string;

  @ApiProperty({
    description: 'Registration response payload from @simplewebauthn/browser',
    type: Object,
  })
  @IsObject()
  response!: Record<string, unknown>;

  @ApiPropertyOptional({
    example: 'MacBook Air Fingerprint',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  credentialName?: string;
}
