import { IsOptional, IsString, IsObject, IsNumber, Min } from 'class-validator';
import { IsCpf } from '../../common/validators/is-cpf.validator.js';

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

  @IsString()
  @IsOptional()
  paymentCategory?: string;

  @IsObject()
  @IsOptional()
  extraFields?: Record<string, string>;

  /**
   * Valor da inscrição em reais. Não existe coluna própria na Registration —
   * o valor vive em `Payment.amount`, então o service faz upsert do Payment.
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  amount?: number;
}
