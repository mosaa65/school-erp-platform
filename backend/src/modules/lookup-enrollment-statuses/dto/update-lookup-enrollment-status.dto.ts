import { PartialType } from '@nestjs/swagger';
import { CreateLookupEnrollmentStatusDto } from './create-lookup-enrollment-status.dto';

export class UpdateLookupEnrollmentStatusDto extends PartialType(
  CreateLookupEnrollmentStatusDto,
) {}
