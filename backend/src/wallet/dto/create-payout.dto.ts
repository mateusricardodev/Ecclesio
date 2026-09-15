import { IsNumber, Min } from 'class-validator';

export class CreatePayoutDto {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor deve ser numérico' })
  @Min(0.01, { message: 'Valor do resgate deve ser maior que zero' })
  amount: number;
}
