import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AnalyticsService } from './analytics.service';

@Controller('admin/metrics')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}
  @Get()
  dashboard(@Query('days') days?: string) { return this.analytics.dashboard(days); }
}
