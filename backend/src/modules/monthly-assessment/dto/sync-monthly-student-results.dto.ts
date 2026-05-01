import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SyncMonthlyStudentResultsDto {
  @ApiProperty({ example: 'cmabc123period' })
  @IsString()
  assessmentPeriodId!: string;

  @ApiPropertyOptional({ example: 'cmabc123section' })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiPropertyOptional({ example: 'cmabc123subject' })
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional({ example: 'cmabc123enrollment' })
  @IsOptional()
  @IsString()
  studentEnrollmentId?: string;
}
