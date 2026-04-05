import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateRecurringJournalDto } from './create-recurring-journal.dto';

export class UpdateRecurringJournalDto extends PartialType(
  OmitType(CreateRecurringJournalDto, ['lines'] as const),
) {}
