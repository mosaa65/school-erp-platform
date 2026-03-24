import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHealthVisitDto {
  @ApiProperty({ example: 'cmabc123student' })
  @IsNotEmpty()
  @IsString()
  studentId: string;

  @ApiProperty({ example: 'emp-registrar' })
  @IsOptional()
  @IsString()
  nurseId?: string;

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  healthStatusId: number;

  @ApiProperty({
    example: '2026-03-12T08:30:00.000Z',
    description: 'UTC timestamp when the visit occurred',
  })
  @IsNotEmpty()
  @IsDateString()
  visitDate: string;

  @ApiProperty({
    example: 'تم فحص الطالب ولم يُظهر أي أعراض.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({
    example: true,
    description: 'Indicates whether follow-up care is required',
    required: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  followUpRequired?: boolean;

  @ApiProperty({
    example: 'مراجعة مع قسم الصحة الأسبوع القادم.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  followUpNotes?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
