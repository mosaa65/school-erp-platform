import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength } from 'class-validator';

export class IdentifyAuthAccountDto {
  @ApiProperty({ example: '+967772217218' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MaxLength(191)
  loginId!: string;
}
