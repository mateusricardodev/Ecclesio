import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { VolunteersService } from './volunteers.service.js';
import { JwtGuard } from '../auth/guards/jwt.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AddVolunteerDto } from './dto/add-volunteer.dto.js';

@UseGuards(JwtGuard)
@Controller('events/:eventId/volunteers')
export class VolunteersController {
  constructor(private readonly volunteers: VolunteersService) {}

  @Get()
  list(@Param('eventId') eventId: string, @CurrentUser() user: { id: string }) {
    return this.volunteers.list(eventId, user.id);
  }

  @Post()
  add(
    @Param('eventId') eventId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: AddVolunteerDto,
  ) {
    return this.volunteers.add(eventId, user.id, dto.email);
  }

  @Delete(':userId')
  remove(
    @Param('eventId') eventId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.volunteers.remove(eventId, user.id, userId);
  }
}
