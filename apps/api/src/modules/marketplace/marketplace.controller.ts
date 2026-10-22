import { Controller, Get, Post, Patch, Delete, UseGuards, Request, Body, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MarketplaceService } from './marketplace.service';
import { CreateProductDto, ProductStatusDto } from './dto/product.dto';
@Controller('marketplace/products')
@UseGuards(JwtAuthGuard)
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}
  @Get() list() { return this.marketplace.list(); }
  @Get(':id') find(@Param('id') id: string) { return this.marketplace.find(id); }
  @Post() create(@Request() req, @Body() body: CreateProductDto) { return this.marketplace.create(req.user.userId, body); }
  @Patch(':id/status') status(@Request() req, @Param('id') id: string, @Body() body: ProductStatusDto) {
    return this.marketplace.status(req.user.userId, id, body.status);
  }
  @Delete(':id') remove(@Request() req, @Param('id') id: string) { return this.marketplace.remove(req.user.userId, id); }
}
