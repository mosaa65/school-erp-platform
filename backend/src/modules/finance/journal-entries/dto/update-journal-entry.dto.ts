import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateJournalEntryDto } from './create-journal-entry.dto';

export class UpdateJournalEntryDto extends PartialType(CreateJournalEntryDto) {
  @ApiPropertyOptional({ example: 'Reversal approved by audit' })
  @IsOptional()
  @IsString()
  reversalReason?: string;
}
