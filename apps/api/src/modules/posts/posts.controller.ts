import {
  Controller,
  UseGuards,
  Request,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PostsService } from './posts.service';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  findAll(@Query('category') category?: string) {
    return this.postsService.findAll(category);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Request() req,
    @Body()
    body: {
      authorId: string;
      authorAvatar: string;
      isVerified: boolean;
      content: string;
      mediaUrl?: string;
      hasProduct?: boolean;
      tags?: string[];
    }
  ) {
    return this.postsService.create({ ...body, authorId: req.user.userId,
      authorAvatar: req.user.avatar, isVerified: req.user.isVerified });
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  toggleLike(@Param('id') id: string) {
    return this.postsService.toggleLike(id);
  }

  @Post(':id/bookmark')
  @HttpCode(HttpStatus.OK)
  toggleBookmark(@Param('id') id: string) {
    return this.postsService.toggleBookmark(id);
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  addComment(
    @Request() req,
    @Param('id') id: string,
    @Body()
    body: {
      author?: string;
      authorAvatar?: string;
      isVerified?: boolean;
      text: string;
    }
  ) {
    if (!body?.text?.trim()) {
      throw new BadRequestException('El comentario no puede estar vacío');
    }
    return this.postsService.addComment(
      id,
      req.user.userId,
      req.user.name,
      req.user.avatar,
      req.user.isVerified,
      body.text.trim()
    );
  }
}
