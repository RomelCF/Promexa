import {
  Controller,
  Patch,
  Body,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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

  @Get('search')
  async search(@Query('q') query: string, @Request() req) {
    return this.usersService.searchUsers(query || '', req.user.userId);
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
}
