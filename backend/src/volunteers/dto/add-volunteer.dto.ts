import { IsEmail } from 'class-validator';

export class AddVolunteerDto {
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;
}
