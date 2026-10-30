import {
  Controller,
  Patch,
  Body,
  Get,
  Post,
  Delete,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me/password')
  changePassword(@Request() req, @Body() body: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.userId, body);
  }

  @Patch('me')
  updateProfile(@Request() req, @Body() body: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, body);
  }

  @Get('friends')
  getFriends(@Request() req) {
    return this.usersService.getFriends(req.user.userId);
  }

  @Get('recommended')
  getRecommendedFriends(@Request() req) {
    return this.usersService.getRecommendedFriends(req.user.userId);
  }

  @Get('followers')
  getFollowers(@Request() req) { return this.usersService.getFollowers(req.user.userId); }

  @Get('following')
  getFollowing(@Request() req) { return this.usersService.getFollowing(req.user.userId); }

  @Post(':id/follow')
  follow(@Param('id') id: string, @Request() req) { return this.usersService.followBusiness(req.user.userId, id); }

  @Delete(':id/follow')
  unfollow(@Param('id') id: string, @Request() req) { return this.usersService.unfollowBusiness(req.user.userId, id); }

  @Get('search')
  async search(@Query('q') query: string, @Request() req) {
    return this.usersService.searchUsers(query || '', req.user.userId);
  }

  @Get(':id/profile')
  @UseGuards(JwtAuthGuard)
  async getUserProfile(@Param('id') targetId: string, @Request() req) {
    return this.usersService.getUserFullProfile(targetId, req.user.userId);
  }

  @Get(':id/relationship')
  @UseGuards(JwtAuthGuard)
  async getRelationshipStatus(@Param('id') targetId: string, @Request() req) {
    return this.usersService.getRelationshipStatus(req.user.userId, targetId);
  }

  @Get('notifications')
  @UseGuards(JwtAuthGuard)
  async getNotifications(@Request() req) {
    return this.usersService.getNotifications(req.user.userId);
  }

  @Post('notifications/:id/dismiss')
  @UseGuards(JwtAuthGuard)
  async dismissNotification(@Param('id') id: string, @Request() req) {
    return this.usersService.dismissNotification(id, req.user.userId);
  }

  @Post(':id/friend-request')
  @UseGuards(JwtAuthGuard)
  async sendFriendRequest(@Param('id') targetId: string, @Request() req) {
    const currentUserId = req.user.userId;
    return this.usersService.sendFriendRequest(currentUserId, targetId);
  }

  @Get('friend-requests')
  async getFriendRequests(@Request() req) {
    return this.usersService.getPendingFriendRequests(req.user.userId);
  }

  @Post('friend-requests/:id/accept')
  @UseGuards(JwtAuthGuard)
  async acceptFriendRequest(@Param('id') requestId: string, @Request() req) {
    const currentUserId = req.user.userId;
    return this.usersService.acceptFriendRequest(requestId, currentUserId);
  }

  @Post('friend-requests/:id/reject')
  @UseGuards(JwtAuthGuard)
  async rejectFriendRequest(@Param('id') requestId: string, @Request() req) {
    const currentUserId = req.user.userId;
    return this.usersService.rejectFriendRequest(requestId, currentUserId);
  }

  @Get('admin/all')
  @UseGuards(AdminGuard)
  async getAllUsersForAdmin() {
    return this.usersService.getAllUsersForAdmin();
  }

  @Patch('admin/:id')
  @UseGuards(AdminGuard)
  async updateUserByAdmin(@Param('id') targetId: string, @Body() body: any) {
    return this.usersService.updateUserByAdmin(targetId, body);
  }

  @Delete('admin/:id')
  @UseGuards(AdminGuard)
  async deleteUserByAdmin(@Param('id') targetId: string) {
    return this.usersService.deleteUserByAdmin(targetId);
  }
}

