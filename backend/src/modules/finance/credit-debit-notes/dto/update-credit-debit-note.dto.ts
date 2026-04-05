import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCreditDebitNoteDto } from './create-credit-debit-note.dto';

export class UpdateCreditDebitNoteDto extends PartialType(
  OmitType(CreateCreditDebitNoteDto, ['noteType', 'originalInvoiceId'] as const),
) {}
