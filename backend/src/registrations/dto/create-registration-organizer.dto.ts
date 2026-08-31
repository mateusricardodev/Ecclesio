import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { IsCpf } from '../../common/validators/is-cpf.validator.js';

export class CreateRegistrationOrganizerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsCpf()
  @IsString()
  @IsNotEmpty()
  cpf: string;

  @IsString()
  @IsOptional()
  ticketId?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  birthDate?: string;

  @IsObject()
  @IsOptional()
  extraFields?: Record<string, string>;
}
