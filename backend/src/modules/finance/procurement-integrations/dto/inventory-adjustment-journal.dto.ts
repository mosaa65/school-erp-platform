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

export enum InventoryAdjustmentType {
  INCREASE = 'INCREASE',
  DECREASE = 'DECREASE',
}

export class InventoryAdjustmentJournalDto {
  @ApiProperty({
    example: 3200,
    description: 'Inventory adjustment amount in base currency',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: InventoryAdjustmentType })
  @IsEnum(InventoryAdjustmentType)
  adjustmentType!: InventoryAdjustmentType;

  @ApiPropertyOptional({ example: 1, description: 'Branch ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  branchId?: number;

  @ApiPropertyOptional({ example: 'قيد تسوية مخزون نهاية الشهر' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
