import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
}

// Confere o ID token que o botão "Entrar com Google" entrega ao frontend.
// Isolado num provider próprio para os testes do AuthService poderem trocá-lo
// por um mock sem tocar na rede.
@Injectable()
export class GoogleTokenVerifier {
  private readonly clientId = process.env.GOOGLE_CLIENT_ID;
  private readonly client = new OAuth2Client();

  async verify(idToken: string): Promise<GoogleProfile> {
    if (!this.clientId) {
      throw new ServiceUnavailableException('Login com Google não configurado');
    }

    let payload: TokenPayload | undefined;
    try {
      // Valida assinatura, expiração, emissor e se o token foi emitido para
      // o nosso Client ID (audience) — um token de outro app é recusado.
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Token do Google inválido');
    }

    // Sem e-mail verificado não dá para vincular a uma conta existente com
    // segurança: qualquer um poderia "provar" um e-mail que não é dele.
    if (!payload?.sub || !payload.email || !payload.email_verified) {
      throw new UnauthorizedException('Conta Google sem e-mail verificado');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name?.trim() || payload.email.split('@')[0],
    };
  }
}
