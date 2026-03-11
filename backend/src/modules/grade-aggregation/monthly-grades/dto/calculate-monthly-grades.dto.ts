import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalculateMonthlyGradesDto {
  @ApiProperty({ example: 'cmabc123month' })
  @IsString()
  academicMonthId!: string;

  @ApiProperty({ example: 'cmabc123section' })
  @IsString()
  sectionId!: string;

  @ApiProperty({ example: 'cmabc123subject' })
  @IsString()
  subjectId!: string;

  @ApiPropertyOptional({
    example: false,
    description:
      'When true, recalculation resets manual fields (activity and contribution) to 0',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  overwriteManual?: boolean;
}
