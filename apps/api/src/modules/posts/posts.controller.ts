import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  findAll(@Query('category') category?: string) {
    return this.postsService.findAll(category);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body()
    body: {
      author: string;
      authorAvatar: string;
      isVerified: boolean;
      content: string;
      mediaUrl?: string;
      hasProduct?: boolean;
      tags?: string[];
    }
  ) {
    return this.postsService.create(body);
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
    @Param('id') id: string,
    @Body()
    body: {
      author: string;
      authorAvatar: string;
      isVerified: boolean;
      text: string;
    }
  ) {
    return this.postsService.addComment(
      id,
      body.author,
      body.authorAvatar,
      body.isVerified,
      body.text
    );
  }
}
