import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/postgres/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PostsModule } from './modules/posts/posts.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { StorageModule } from './modules/storage/storage.module';
import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PostsModule,
    ChatModule,
    StorageModule,
    MarketplaceModule,
  ],
})
export class AppModule {}
