import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome' })
  @MaxLength(120, { message: 'Nome muito longo' })
  name: string;
}
