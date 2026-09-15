import { IsIn, IsString, Length, Matches } from 'class-validator';

export const PIX_KEY_TYPES = [
  'cpf',
  'cnpj',
  'email',
  'phone',
  'random',
] as const;

export class UpdatePixAccountDto {
  @IsIn(PIX_KEY_TYPES, { message: 'Tipo de chave PIX inválido' })
  pixKeyType: string;

  @IsString()
  @Length(3, 140, { message: 'Chave PIX inválida' })
  pixKey: string;

  @IsString()
  @Length(3, 140, { message: 'Informe o nome do titular da conta' })
  pixHolderName: string;

  /**
   * CPF ou CNPJ do titular. Serve de conferência antes do repasse: o dinheiro
   * não deve sair para uma conta de titularidade diferente da cadastrada.
   */
  @IsString()
  @Matches(/^\d{11}$|^\d{14}$/, {
    message:
      'Documento do titular deve ser um CPF (11 dígitos) ou CNPJ (14 dígitos)',
  })
  pixHolderDocument: string;
}
