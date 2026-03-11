import { PartialType } from '@nestjs/swagger';
import { CreateAnnualGradeDto } from './create-annual-grade.dto';

export class UpdateAnnualGradeDto extends PartialType(CreateAnnualGradeDto) {}
