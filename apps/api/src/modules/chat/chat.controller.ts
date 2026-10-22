import { Controller, Get, Request, UseGuards } from '@nestjs/common';
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
}
