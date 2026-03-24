import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateHealthVisitDto {
  @ApiPropertyOptional({ example: 'cmabc123student' })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ example: 'emp-registrar' })
  @IsOptional()
  @IsString()
  nurseId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  healthStatusId?: number;

  @ApiPropertyOptional({
    example: '2026-03-12T08:30:00.000Z',
    description: 'UTC timestamp when the visit occurred',
  })
  @IsOptional()
  @IsDateString()
  visitDate?: string;

  @ApiPropertyOptional({
    example: 'تم فحص الطالب ولم يُظهر أي أعراض.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Indicates whether follow-up care is required',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  followUpRequired?: boolean;

  @ApiPropertyOptional({
    example: 'مراجعة مع قسم الصحة الأسبوع القادم.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  followUpNotes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
