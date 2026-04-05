import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { FeeType, InvoiceStatus } from '@prisma/client';

class InvoiceLineInputDto {
  @ApiProperty({ enum: FeeType })
  @IsEnum(FeeType)
  feeType!: FeeType;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  feeStructureId?: number;

  @ApiProperty({ example: 'رسوم دراسية - الفصل الأول' })
  @IsString()
  @MaxLength(200)
  descriptionAr!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 1500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  discountRuleId?: number;

  @ApiPropertyOptional({ example: 5007 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  discountGlAccountId?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  vatRate?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  vatAmount?: number;

  @ApiPropertyOptional({ example: 1001 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  taxCodeId?: number;

  @ApiPropertyOptional({ example: 1001 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  accountId?: number;
}

class InvoiceInstallmentInputDto {
  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  dueDate!: string;

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  installmentNumber!: number;

  @ApiPropertyOptional({ example: '2026-04-10' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  lateFee?: number;

  @ApiPropertyOptional({ example: 'First installment' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}

export class CreateStudentInvoiceDto {
  @ApiPropertyOptional({ example: 'INV-20260318-123456' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  invoiceNumber?: string;

  @ApiProperty({ example: 'cmabc123enrollment' })
  @IsString()
  @MaxLength(191)
  enrollmentId!: string;

  @ApiProperty({ example: 'cmabc123year' })
  @IsString()
  @MaxLength(191)
  academicYearId!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchId?: number;

  @ApiProperty({ example: '2026-03-18' })
  @IsDateString()
  invoiceDate!: string;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  dueDate!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currencyId?: number;

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ example: 'First term tuition' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [InvoiceLineInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineInputDto)
  lines!: InvoiceLineInputDto[];

  @ApiPropertyOptional({ type: [InvoiceInstallmentInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceInstallmentInputDto)
  installments?: InvoiceInstallmentInputDto[];
}

export { InvoiceLineInputDto, InvoiceInstallmentInputDto };
