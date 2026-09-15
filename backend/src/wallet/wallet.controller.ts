import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WalletService } from './wallet.service.js';
import { JwtGuard } from '../auth/guards/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UpdatePixAccountDto } from './dto/update-pix-account.dto.js';
import { CreatePayoutDto } from './dto/create-payout.dto.js';
import { UpdatePayoutDto } from './dto/update-payout.dto.js';

/** Carteira do próprio organizador autenticado. */
@UseGuards(JwtGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  /** Saldo disponível, retido, total ganho e total já resgatado. */
  @Get('summary')
  getSummary(@CurrentUser() user: { id: string }) {
    return this.wallet.getSummary(user.id);
  }

  /** Extrato do razão, mais recente primeiro. */
  @Get('entries')
  listEntries(
    @CurrentUser() user: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.wallet.listEntries(
      user.id,
      Number(page) || 1,
      Number(limit) || 30,
    );
  }

  @Get('pix-account')
  getPixAccount(@CurrentUser() user: { id: string }) {
    return this.wallet.getPixAccount(user.id);
  }

  @Put('pix-account')
  updatePixAccount(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePixAccountDto,
  ) {
    return this.wallet.updatePixAccount(user.id, dto);
  }

  @Get('payouts')
  listPayouts(@CurrentUser() user: { id: string }) {
    return this.wallet.listPayouts(user.id);
  }

  @Post('payouts')
  requestPayout(
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePayoutDto,
  ) {
    return this.wallet.requestPayout(user.id, dto.amount);
  }
}

/**
 * Fila de resgates da plataforma. Na v1 o PIX é enviado à mão pelo admin, que
 * depois marca o pedido como pago aqui.
 */
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminPayoutsController {
  constructor(private readonly wallet: WalletService) {}

  @Get('payouts')
  listPayouts(@Query('status') status?: string) {
    return this.wallet.listAllPayouts(status);
  }

  @Patch('payouts/:id')
  updatePayout(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdatePayoutDto,
  ) {
    return this.wallet.updatePayout(id, user.id, dto);
  }

  @Get('revenue')
  getRevenue() {
    return this.wallet.getPlatformRevenue();
  }
}
