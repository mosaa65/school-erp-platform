import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, Matches } from 'class-validator';

export class VerifyMfaDto {
  @ApiProperty({
    example: 'cm9jw4kln0000dr2q4xv4d4o9',
  })
  @IsString()
  @MaxLength(191)
  challengeId!: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit TOTP code from authenticator app',
  })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
