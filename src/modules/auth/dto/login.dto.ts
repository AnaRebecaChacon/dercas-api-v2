import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export enum ClientType {
  WEB = 'web',
  ANDROID = 'android',
}

export class LoginDto {
  @IsEmail({}, { message: 'Formato de correo inválido' })
  correo: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsEnum(ClientType, { message: 'Client debe ser web o android' })
  client: ClientType;

  @IsOptional()
  @IsString()
  installation_uuid?: string;
}
