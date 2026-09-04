import { Body, Controller, Get, Param, Patch, ParseIntPipe, Post, Put, Query, Res, UseGuards, DefaultValuePipe } from '@nestjs/common';
import type { Response } from 'express';
import { RegistrationsService } from './registrations.service.js';
import { CreateRegistrationDto } from './dto/create-registration.dto.js';
import { CreateRegistrationOrganizerDto } from './dto/create-registration-organizer.dto.js';
import { UpdateRegistrationDto } from './dto/update-registration.dto.js';
import { JwtGuard } from '../auth/guards/jwt.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller()
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @UseGuards(JwtGuard)
  @Post('registrations')
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRegistrationDto,
  ) {
    return this.registrationsService.create(user.id, dto);
  }

  @UseGuards(JwtGuard)
  @Get('my-registrations')
  myRegistrations(
    @CurrentUser() user: { id: string },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.registrationsService.findMyRegistrations(user.id, page, limit);
  }

  @UseGuards(JwtGuard)
  @Get('events/:eventId/registrations')
  findByEvent(
    @Param('eventId') eventId: string,
    @CurrentUser() user: { id: string },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.registrationsService.findByEvent(eventId, user.id, page, limit);
  }

  @UseGuards(JwtGuard)
  @Get('events/:eventId/registrations/export')
  async exportRegistrations(
    @Param('eventId') eventId: string,
    @CurrentUser() user: { id: string },
    @Query('search') search: string | undefined,
    @Query('status') status: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @Query('method') method: string | undefined,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.registrationsService.exportToXlsx(eventId, user.id, {
      search,
      status,
      dateFrom,
      dateTo,
      method,
    });
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  @UseGuards(JwtGuard)
  @Post('events/:eventId/registrations')
  createByOrganizer(
    @Param('eventId') eventId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRegistrationOrganizerDto,
  ) {
    return this.registrationsService.createByOrganizer(eventId, user.id, dto);
  }

  @UseGuards(JwtGuard)
  @Get('registrations/search')
  search(@Query('q') q: string, @CurrentUser() user: { id: string }) {
    return this.registrationsService.search(q ?? '', user.id);
  }

  @UseGuards(JwtGuard)
  @Put('registrations/:id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateRegistrationDto,
  ) {
    return this.registrationsService.update(id, user.id, dto);
  }

  @UseGuards(JwtGuard)
  @Post('registrations/:id/resend-confirmation')
  resendConfirmation(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.registrationsService.resendConfirmation(id, user.id);
  }

  @UseGuards(JwtGuard)
  @Patch('registrations/:id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.registrationsService.cancel(id, user.id);
  }
}
