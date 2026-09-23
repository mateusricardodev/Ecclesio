import {
  IsOptional,
  IsString,
  IsObject,
  IsNumber,
  IsIn,
  Min,
} from 'class-validator';
import { IsCpf } from '../../common/validators/is-cpf.validator.js';

export const PAYMENT_METHODS = [
  'pix',
  'credit_card',
  'debit_card',
  'cash',
] as const;

export class UpdateRegistrationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsCpf()
  @IsString()
  @IsOptional()
  cpf?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  birthDate?: string;

  @IsString()
  @IsOptional()
  ticketId?: string;

  @IsObject()
  @IsOptional()
  extraFields?: Record<string, string>;

  /**
   * Valor da inscrição em reais. Não existe coluna própria na Registration;
   * o valor vive em `Payment.amount`, então o service faz upsert do Payment.
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  amount?: number;

  /**
   * Modalidade de pagamento (`Payment.method`), nos mesmos valores de
   * `EventPaymentMethod.type`. `null` limpa a modalidade registrada;
   * ausente mantém a atual. Não confundir com `Payment.provider`, que
   * identifica o gateway e não é alterado por aqui.
   */
  @IsIn(PAYMENT_METHODS)
  @IsOptional()
  method?: string | null;
}
