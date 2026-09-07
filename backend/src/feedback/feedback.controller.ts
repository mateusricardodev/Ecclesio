import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FeedbackService } from './feedback.service.js';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto.js';
import { UpdateFeedbackConfigDto } from './dto/update-feedback-config.dto.js';
import { JwtGuard } from '../auth/guards/jwt.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

/**
 * Sem prefixo de controller: as rotas do organizador vivem sob `events/:id` e
 * as do participante sob `public/`, como no RegistrationsController.
 */
@Controller()
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @UseGuards(JwtGuard)
  @Get('events/:eventId/feedback/config')
  getConfig(@Param('eventId') eventId: string, @CurrentUser() user: { id: string }) {
    return this.feedback.getConfig(eventId, user.id);
  }

  @UseGuards(JwtGuard)
  @Put('events/:eventId/feedback/config')
  updateConfig(
    @Param('eventId') eventId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateFeedbackConfigDto,
  ) {
    return this.feedback.updateConfig(eventId, user.id, dto);
  }

  @UseGuards(JwtGuard)
  @Get('events/:eventId/feedback')
  getResults(@Param('eventId') eventId: string, @CurrentUser() user: { id: string }) {
    return this.feedback.getResults(eventId, user.id);
  }

  @UseGuards(JwtGuard)
  @Post('events/:eventId/feedback/invite')
  sendInvites(@Param('eventId') eventId: string, @CurrentUser() user: { id: string }) {
    return this.feedback.sendInvites(eventId, user.id);
  }

  // ─── Rotas públicas (sem JwtGuard) ─────────────────────────────────────────

  @Get('public/events/:slug/feedback')
  getPublicForm(@Param('slug') slug: string, @Query('r') registrationId?: string) {
    return this.feedback.getPublicForm(slug, registrationId);
  }

  /** Rate limit mais restrito para evitar spam de respostas. */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('public/events/:slug/feedback')
  submit(@Param('slug') slug: string, @Body() dto: SubmitFeedbackDto) {
    return this.feedback.submit(slug, dto);
  }
}
