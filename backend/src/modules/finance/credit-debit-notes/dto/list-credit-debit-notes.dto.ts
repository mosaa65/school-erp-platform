import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import {
  CreditDebitNoteReason,
  CreditDebitNoteStatus,
  CreditDebitNoteType,
} from '@prisma/client';

export class ListCreditDebitNotesDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ enum: CreditDebitNoteType })
  @IsOptional()
  @IsEnum(CreditDebitNoteType)
  noteType?: CreditDebitNoteType;

  @ApiPropertyOptional({ enum: CreditDebitNoteStatus })
  @IsOptional()
  @IsEnum(CreditDebitNoteStatus)
  status?: CreditDebitNoteStatus;

  @ApiPropertyOptional({ enum: CreditDebitNoteReason })
  @IsOptional()
  @IsEnum(CreditDebitNoteReason)
  reason?: CreditDebitNoteReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
