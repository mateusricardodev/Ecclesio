import { Module } from '@nestjs/common';
import { VolunteersService } from './volunteers.service.js';
import { VolunteersController } from './volunteers.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  providers: [VolunteersService],
  controllers: [VolunteersController],
})
export class VolunteersModule {}
