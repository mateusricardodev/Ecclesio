import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service.js';
import {
  WalletController,
  AdminPayoutsController,
} from './wallet.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  providers: [WalletService],
  controllers: [WalletController, AdminPayoutsController],
  exports: [WalletService],
})
export class WalletModule {}
