import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export enum AuditRollbackMode {
  PREVIOUS = 'PREVIOUS',
  TARGET = 'TARGET',
}

export class RollbackAuditLogDto {
  @ApiPropertyOptional({
    enum: AuditRollbackMode,
    example: AuditRollbackMode.PREVIOUS,
    description:
      'PREVIOUS rolls back to the immediately previous timeline item, TARGET rolls back to a user-selected timeline item.',
  })
  @IsOptional()
  @IsEnum(AuditRollbackMode)
  mode?: AuditRollbackMode = AuditRollbackMode.PREVIOUS;

  @ApiPropertyOptional({
    example: 'cmnabc1234',
    description:
      'Required when mode=TARGET. Must exist in the last 10 timeline changes.',
  })
  @ValidateIf((value: RollbackAuditLogDto) => value.mode === AuditRollbackMode.TARGET)
  @IsString()
  @MaxLength(191)
  targetAuditLogId?: string;
}
