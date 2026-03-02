import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RevokeUserPermissionDto {
  @ApiPropertyOptional({ example: 'Direct access no longer needed' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  revokeReason?: string;
}
