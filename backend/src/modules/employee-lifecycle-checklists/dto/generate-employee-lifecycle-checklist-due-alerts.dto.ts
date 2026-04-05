import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class GenerateEmployeeLifecycleChecklistDueAlertsDto {
  @ApiPropertyOptional({
    example: 3,
    description: 'عدد الأيام القادمة التي تعتبر ضمن نافذة التنبيه، وتشمل المهام المتأخرة.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  daysThreshold?: number;
}
