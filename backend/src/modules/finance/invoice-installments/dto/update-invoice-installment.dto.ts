import { PartialType } from '@nestjs/swagger';
import { CreateInvoiceInstallmentDto } from './create-invoice-installment.dto';

export class UpdateInvoiceInstallmentDto extends PartialType(CreateInvoiceInstallmentDto) {}
