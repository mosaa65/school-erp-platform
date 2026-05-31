import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class HomeworkWorkflowActionDto {
  @ApiPropertyOptional({ example: 'تمت مراجعة الواجب واعتماده.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  lockAfterApprove?: boolean;
}
