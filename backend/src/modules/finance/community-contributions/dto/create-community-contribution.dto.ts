import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateCommunityContributionDto {
  @ApiProperty({ example: 'enrollment-id' })
  @IsString()
  @MaxLength(191)
  enrollmentId!: string;

  @ApiProperty({ example: 'academic-year-id' })
  @IsString()
  @MaxLength(191)
  academicYearId!: string;

  @ApiProperty({ example: 'term-id' })
  @IsString()
  @MaxLength(191)
  semesterId!: string;

  @ApiProperty({ example: 'month-id' })
  @IsString()
  @MaxLength(191)
  monthId!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weekId?: number;

  @ApiProperty({ example: '2026-03-10' })
  @IsDateString()
  paymentDate!: string;

  @ApiPropertyOptional({ example: '1447-08-20' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  paymentDateHijri?: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  requiredAmountId!: number;

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

  @ApiPropertyOptional({
    example: true,
    description:
      'Create and link invoice/payment journal automatically when possible',
  })
  @IsOptional()
  @IsBoolean()
  autoBridge?: boolean;
}
