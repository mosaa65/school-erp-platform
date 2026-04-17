import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAssessmentComponentSourcePeriodDto {
  @ApiProperty({ example: 'cmabc123component' })
  @IsString()
  assessmentPeriodComponentId!: string;

  @ApiProperty({ example: 'cmabc123period' })
  @IsString()
  sourcePeriodId!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
