import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class MfaCodeDto {
  @ApiProperty({
    example: '123456',
    description: '6-digit code from authenticator app',
  })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
