import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength } from 'class-validator';

export class CompleteDeviceApprovalDto {
  @ApiProperty({ example: 'cmdeviceapproval123' })
  @IsString()
  @MaxLength(191)
  requestId!: string;

  @ApiProperty({ example: '482913' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MaxLength(32)
  approvalCode!: string;
}
