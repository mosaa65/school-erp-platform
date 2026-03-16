import { PartialType } from '@nestjs/swagger';
import { CreateEmployeePerformanceEvaluationDto } from './create-employee-performance-evaluation.dto';

export class UpdateEmployeePerformanceEvaluationDto extends PartialType(
  CreateEmployeePerformanceEvaluationDto,
) {}
