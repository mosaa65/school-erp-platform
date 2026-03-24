import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCommunityContributionDto {
  @ApiPropertyOptional({ example: 'enrollment-id' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  enrollmentId?: string;

  @ApiPropertyOptional({ example: 'academic-year-id' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  academicYearId?: string;

  @ApiPropertyOptional({ example: 'term-id' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  semesterId?: string;

  @ApiPropertyOptional({ example: 'month-id' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  monthId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weekId?: number;

  @ApiPropertyOptional({ example: '2026-03-10' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({ example: '1447-08-20' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  paymentDateHijri?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  requiredAmountId?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  receivedAmount?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isExempt?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  exemptionReasonId?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  exemptionAmount?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  exemptionAuthorityId?: number;

  @ApiPropertyOptional({ example: 'employee-id' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  recipientEmployeeId?: string;

  @ApiPropertyOptional({ example: 'Parent name' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  payerName?: string;

  @ApiPropertyOptional({ example: 'RCPT-2026-0001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  receiptNumber?: string;

  @ApiPropertyOptional({ example: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: '12345' })
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @ApiPropertyOptional({ example: 'journal-entry-id' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  journalEntryId?: string;
}
