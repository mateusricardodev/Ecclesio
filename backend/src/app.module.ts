import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { EventsModule } from './events/events.module.js';
import { TicketsModule } from './tickets/tickets.module.js';
import { RegistrationsModule } from './registrations/registrations.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { CheckinModule } from './checkin/checkin.module.js';
import { PublicModule } from './public/public.module.js';
import { FeedbackModule } from './feedback/feedback.module.js';
import { WalletModule } from './wallet/wallet.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // THROTTLE_SKIP=1 desativa o rate limit (usado apenas nos testes e2e)
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: 60, skipIf: () => process.env.THROTTLE_SKIP === '1' },
    ]),
    PrismaModule,
    AuthModule,
    EventsModule,
    TicketsModule,
    RegistrationsModule,
    PaymentsModule,
    CheckinModule,
    PublicModule,
    FeedbackModule,
    WalletModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
