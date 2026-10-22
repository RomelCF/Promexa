import { Controller, Get, Post, Param, Request, UploadedFile, UseGuards, UseInterceptors, Header } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}
  @Post('images/:purpose')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0 } }))
  upload(@Param('purpose') purpose: string, @Request() req, @UploadedFile() file: Express.Multer.File) {
    return this.storage.upload(purpose, req.user.userId, file);
  }
  @Get('images/:purpose/:userId/:file')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @Header('X-Content-Type-Options', 'nosniff')
  read(@Param('purpose') purpose: string, @Param('userId') userId: string, @Param('file') file: string) {
    return this.storage.read(purpose, userId, file);
  }
}
