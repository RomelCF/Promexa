import { Controller, Get, Post, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('contacts')
  contacts(@Request() req) { return this.chat.contacts(req.user.userId); }

  @Get('messages')
  history(@Request() req) {
    return this.chat.history(req.user.userId);
  }

  @Post('read/:senderId')
  markAsRead(@Request() req, @Param('senderId') senderId: string) {
    return this.chat.markAsRead(req.user.userId, senderId);
  }
}

