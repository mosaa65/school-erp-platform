import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteAccountActivationDto {
  @ApiProperty({ example: 'cmactivationrequest123' })
  @IsString()
  @MaxLength(191)
  requestId!: string;

  @ApiProperty({ example: '482913' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MaxLength(32)
  approvalCode!: string;

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
