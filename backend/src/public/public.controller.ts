import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PublicService } from './public.service.js';
import { PublicRegistrationDto } from './dto/public-registration.dto.js';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('events/:slug')
  findEvent(@Param('slug') slug: string) {
    return this.publicService.findEventBySlug(slug);
  }

  /** Rate limit mais restrito para evitar spam/bot no cadastro público. */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('events/:slug/register')
  register(@Param('slug') slug: string, @Body() dto: PublicRegistrationDto) {
    return this.publicService.register(slug, dto);
  }

  /** Status do pagamento consultado pelo inscrito (sem auth: registrationId é UUID não-adivinhável). */
  @Get('payments/status/:registrationId')
  getPaymentStatus(@Param('registrationId') registrationId: string) {
    return this.publicService.getPaymentStatus(registrationId);
  }
}
