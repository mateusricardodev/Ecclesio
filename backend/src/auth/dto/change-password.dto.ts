import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  // Obrigatória só quando a conta já tem senha conhecida (hasPassword); o
  // service confere. Conta criada pelo Google define a primeira senha sem ela.
  @IsString()
  @IsOptional()
  currentPassword?: string;

  // Mesma regra do cadastro (RegisterDto).
  @IsString()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @Matches(/^(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: 'Senha deve conter ao menos uma letra maiúscula e um número',
  })
  newPassword: string;
}
