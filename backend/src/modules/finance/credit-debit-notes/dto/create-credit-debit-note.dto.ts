import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CreditDebitNoteReason, CreditDebitNoteType } from '@prisma/client';

export class CreateCreditDebitNoteDto {
  @ApiProperty({ enum: CreditDebitNoteType })
  @IsEnum(CreditDebitNoteType)
  noteType!: CreditDebitNoteType;

  @ApiProperty({ example: '1', description: 'Original invoice ID' })
  @IsString()
  originalInvoiceId!: string;

  @ApiPropertyOptional({ example: 'cmabc123enrollment' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  enrollmentId?: string;

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ example: 75 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  vatAmount?: number;

  @ApiProperty({ enum: CreditDebitNoteReason })
  @IsEnum(CreditDebitNoteReason)
  reason!: CreditDebitNoteReason;

  @ApiPropertyOptional({ example: 'انسحاب الطالب بعد أسبوعين' })
  @IsOptional()
  @IsString()
  reasonDetails?: string;
}
