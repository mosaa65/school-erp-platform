import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class EnsureMonthlyStudentResultsDto {
  @ApiProperty({ example: 'cmabc123period' })
  @IsString()
  assessmentPeriodId!: string;

  @ApiProperty({ example: 'cmabc123section' })
  @IsString()
  sectionId!: string;

  @ApiProperty({ example: 'cmabc123subject' })
  @IsString()
  subjectId!: string;

  @ApiPropertyOptional({ example: 'cmabc123tso' })
  @IsOptional()
  @IsString()
  termSubjectOfferingId?: string;
}
