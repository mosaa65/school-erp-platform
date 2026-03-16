import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStudentProblemDto {
  @ApiProperty({ example: 'cmabc123student' })
  @IsString()
  studentId!: string;

  @ApiProperty({ example: '2026-10-05T00:00:00.000Z' })
  @IsDateString()
  problemDate!: string;

  @ApiPropertyOptional({ example: 'سلوكي' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  problemType?: string;

  @ApiProperty({ example: 'تأخر متكرر في الحضور الصباحي' })
  @IsString()
  @MaxLength(1000)
  problemDescription!: string;

  @ApiPropertyOptional({
    example: 'تم التواصل مع ولي الأمر وإشعاره بالخطة العلاجية',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  actionsTaken?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasMinutes?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isResolved?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
