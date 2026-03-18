import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalculateSemesterGradesDto {
  @ApiProperty({ example: 'cmabc123term' })
  @IsString()
  academicTermId!: string;

  @ApiProperty({ example: 'cmabc123section' })
  @IsString()
  sectionId!: string;

  @ApiProperty({ example: 'cmabc123subject' })
  @IsString()
  subjectId!: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  overwriteManual?: boolean;
}
