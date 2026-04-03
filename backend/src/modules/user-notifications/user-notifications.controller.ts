import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserNotificationType } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { ListUserNotificationsDto } from './dto/list-user-notifications.dto';
import { UpdateUserNotificationPreferencesDto } from './dto/update-user-notification-preferences.dto';
import { UserNotificationsService } from './user-notifications.service';

@ApiTags('User Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('user-notifications')
export class UserNotificationsController {
  constructor(
    private readonly userNotificationsService: UserNotificationsService,
  ) {}

  @Get()
  @RequirePermissions('user-notifications.read')
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'notificationType', required: false, enum: UserNotificationType })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  findMine(
    @Query() query: ListUserNotificationsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.userNotificationsService.findMine(query, user.userId);
  }

  @Get('unread-count')
  @RequirePermissions('user-notifications.read')
  @ApiOperation({ summary: 'Get current user unread notification count' })
  getUnreadCount(@CurrentUser() user: AuthUser) {
    return this.userNotificationsService.getUnreadCount(user.userId);
  }

  @Get('preferences')
  @RequirePermissions('user-notifications.read')
  @ApiOperation({ summary: 'Get current user notification preferences' })
  getPreferences(@CurrentUser() user: AuthUser) {
    return this.userNotificationsService.getPreferences(user.userId);
  }

  @Patch('preferences')
  @RequirePermissions('user-notifications.update')
  @ApiOperation({ summary: 'Update current user notification preferences' })
  updatePreferences(
    @Body() payload: UpdateUserNotificationPreferencesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.userNotificationsService.updatePreferences(
      payload,
      user.userId,
    );
  }

  @Patch('mark-all-read')
  @RequirePermissions('user-notifications.update')
  @ApiOperation({ summary: 'Mark all current user notifications as read' })
  markAllAsRead(@CurrentUser() user: AuthUser) {
    return this.userNotificationsService.markAllAsRead(user.userId);
  }

  @Patch(':id/read')
  @RequirePermissions('user-notifications.update')
  @ApiOperation({ summary: 'Mark a current user notification as read' })
  markAsRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.userNotificationsService.markAsRead(id, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('user-notifications.delete')
  @ApiOperation({ summary: 'Delete a current user notification' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.userNotificationsService.remove(id, user.userId);
  }
}
