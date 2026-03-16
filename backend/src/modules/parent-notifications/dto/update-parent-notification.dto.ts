import { PartialType } from '@nestjs/swagger';
import { CreateParentNotificationDto } from './create-parent-notification.dto';

export class UpdateParentNotificationDto extends PartialType(
  CreateParentNotificationDto,
) {}
