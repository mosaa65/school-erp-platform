import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentSiblingRelationship } from '@prisma/client';

export class CreateStudentSiblingDto {
  @ApiProperty({ example: 'cmabc123student' })
  @IsString()
  studentId!: string;

  @ApiProperty({ example: 'cmabc123sibling' })
  @IsString()
  siblingId!: string;

  @ApiProperty({ enum: StudentSiblingRelationship, example: StudentSiblingRelationship.BROTHER })
  @IsEnum(StudentSiblingRelationship)
  relationship!: StudentSiblingRelationship;

  @ApiPropertyOptional({ example: 'أخ شقيق يدرس في نفس المدرسة' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
