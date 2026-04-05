import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProcurementVendorBalanceExpenseItemDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ example: 850 })
  amount!: number;

  @ApiProperty({ example: '2026-03-28' })
  expenseDate!: string;

  @ApiProperty()
  isApproved!: boolean;

  @ApiPropertyOptional()
  journalEntryId?: string | null;

  @ApiPropertyOptional()
  invoiceNumber?: string | null;

  @ApiPropertyOptional()
  description?: string | null;
}

export class ProcurementVendorBalanceSummaryDto {
  @ApiProperty({ example: 2 })
  expenseCount!: number;

  @ApiProperty({ example: 1 })
  approvedExpenseCount!: number;

  @ApiProperty({ example: 1 })
  pendingExpenseCount!: number;

  @ApiProperty({ example: 850 })
  approvedExpenseTotal!: number;

  @ApiProperty({ example: 450 })
  pendingExpenseTotal!: number;

  @ApiProperty({ example: 850 })
  balanceDue!: number;
}

export class ProcurementVendorBalanceResponseDto {
  @ApiProperty({ example: 'Vendor-001' })
  vendorKey!: string;

  @ApiProperty({ example: 'Vendor Alpha' })
  vendorName!: string;

  @ApiProperty({ type: ProcurementVendorBalanceSummaryDto })
  summary!: ProcurementVendorBalanceSummaryDto;

  @ApiProperty({ type: [ProcurementVendorBalanceExpenseItemDto] })
  expenses!: ProcurementVendorBalanceExpenseItemDto[];
}
