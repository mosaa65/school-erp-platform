import { ApiProperty } from '@nestjs/swagger';
import { InventoryAdjustmentType } from './inventory-adjustment-journal.dto';

export class InventoryAdjustmentJournalResponseDto {
  @ApiProperty()
  journalEntryId!: string;

  @ApiProperty()
  entryNumber!: string;

  @ApiProperty({ example: 3200 })
  amount!: number;

  @ApiProperty({ enum: InventoryAdjustmentType })
  adjustmentType!: InventoryAdjustmentType;

  @ApiProperty({ example: '5004' })
  debitAccountCode!: string;

  @ApiProperty({ example: '2101' })
  creditAccountCode!: string;
}
