import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Transições que o admin pode aplicar. `requested` não aparece: um resgate
 * nunca volta para a fila depois de assumido.
 */
export const PAYOUT_ADMIN_STATUSES = [
  'processing',
  'paid',
  'rejected',
] as const;

export class UpdatePayoutDto {
  @IsIn(PAYOUT_ADMIN_STATUSES, { message: 'Status inválido' })
  status: (typeof PAYOUT_ADMIN_STATUSES)[number];

  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  receiptUrl?: string;
}
