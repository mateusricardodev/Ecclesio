import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
type Transporter = ReturnType<typeof nodemailer.createTransport>;

export interface FeedbackInviteData {
  participantName: string;
  participantEmail: string;
  eventTitle: string;
  surveyUrl: string;
}

export interface RegistrationConfirmationData {
  participantName: string;
  participantEmail: string;
  eventTitle: string;
  eventDate: Date;
  eventLocation?: string | null;
  registrationId: string;
  registrationCode?: string | null;
  ticketName?: string | null;
  amountPaid?: number | null;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly isDev = process.env.NODE_ENV !== 'production';

  private transporter: Transporter | null = null;
  private transporterPromise: Promise<Transporter> | null = null;

  constructor(private readonly config: ConfigService) {
    if (!this.isDev) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('MAIL_HOST'),
        port: Number(this.config.get('MAIL_PORT', 587)),
        secure: this.config.get<string>('MAIL_SECURE') === 'true',
        auth: {
          user: this.config.get<string>('MAIL_USER'),
          pass: this.config.get<string>('MAIL_PASS'),
        },
      });
    }
  }

  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) return this.transporter;

    if (!this.transporterPromise) {
      this.transporterPromise = nodemailer.createTestAccount().then((account) => {
        this.logger.log(
          `[DEV] Ethereal Email configurado — usuário: ${account.user}`,
        );
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: { user: account.user, pass: account.pass },
        });
        return this.transporter!;
      });
    }

    return this.transporterPromise;
  }

  /**
   * Envia o e-mail de confirmação. Retorna `true` se o SMTP aceitou a mensagem
   * e `false` se o envio falhou — os disparos automáticos são fire-and-forget e
   * ignoram o retorno, mas o reenvio manual pelo organizador precisa saber se
   * saiu para poder avisar na tela.
   */
  async sendRegistrationConfirmation(data: RegistrationConfirmationData): Promise<boolean> {
    const from = this.config.get<string>('MAIL_FROM', 'inscrições.app <noreply@inscricoes.app>');

    const formattedDate = new Date(data.eventDate).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const formattedTime = new Date(data.eventDate).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Gera QR code como buffer PNG para anexar inline
    let qrBuffer: Buffer | null = null;
    if (data.registrationCode) {
      try {
        qrBuffer = await QRCode.toBuffer(data.registrationCode, {
          width: 200,
          margin: 2,
          color: { dark: '#1B2B5E', light: '#F2EDE4' },
        });
      } catch {
        this.logger.warn('Falha ao gerar QR code para o email — enviando sem QR');
      }
    }

    try {
      const transport = await this.getTransporter();
      const info = await transport.sendMail({
        from,
        to: data.participantEmail,
        subject: `Inscrição confirmada — ${data.eventTitle}`,
        html: this.buildEmailHtml({ ...data, formattedDate, formattedTime, hasQr: !!qrBuffer }),
        attachments: qrBuffer
          ? [{ filename: 'qrcode.png', content: qrBuffer, cid: 'qrcode@inscricoes' }]
          : [],
      });

      if (this.isDev) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        this.logger.log(
          `[DEV] Email enviado para ${data.participantEmail} | Visualizar: ${previewUrl}`,
        );
      } else {
        this.logger.log(`Email de confirmação enviado para ${data.participantEmail}`);
      }

      return true;
    } catch (err) {
      this.logger.error(`Falha ao enviar email para ${data.participantEmail}: ${err}`);
      return false;
    }
  }

  /**
   * Convite para a pesquisa de satisfação, disparado pelo organizador depois
   * que o evento termina. Mesmo contrato do e-mail de confirmação: `false`
   * quando o SMTP recusou, para a tela poder mostrar quantos falharam.
   */
  async sendFeedbackInvite(data: FeedbackInviteData): Promise<boolean> {
    const from = this.config.get<string>('MAIL_FROM', 'inscrições.app <noreply@inscricoes.app>');

    try {
      const transport = await this.getTransporter();
      const info = await transport.sendMail({
        from,
        to: data.participantEmail,
        subject: `Como foi para você? — ${data.eventTitle}`,
        html: this.buildFeedbackInviteHtml(data),
      });

      if (this.isDev) {
        this.logger.log(
          `[DEV] Convite de avaliação enviado para ${data.participantEmail} | Visualizar: ${nodemailer.getTestMessageUrl(info)}`,
        );
      } else {
        this.logger.log(`Convite de avaliação enviado para ${data.participantEmail}`);
      }

      return true;
    } catch (err) {
      this.logger.error(
        `Falha ao enviar convite de avaliação para ${data.participantEmail}: ${err}`,
      );
      return false;
    }
  }

  private buildFeedbackInviteHtml(data: FeedbackInviteData): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Avalie o evento</title>
</head>
<body style="margin:0;padding:0;background:#F2EDE4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0"
               style="max-width:580px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(27,43,94,0.12);">

          <!-- Header -->
          <tr>
            <td style="background:#1B2B5E;padding:36px 40px;text-align:center;">
              <p style="margin:0 0 10px 0;color:#C9A84C;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">
                inscrições.app
              </p>
              <h1 style="margin:0 0 6px 0;color:#ffffff;font-size:26px;font-weight:700;">
                Como foi para você?
              </h1>
              <p style="margin:0;color:#a0b0d0;font-size:14px;">
                Olá, <strong style="color:#ffffff;">${data.participantName}</strong>
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 20px 0;color:#33425C;font-size:15px;line-height:1.7;">
                O <strong style="color:#1B2B5E;">${data.eventTitle}</strong> chegou ao fim e a sua
                opinião é o que nos ajuda a fazer o próximo ainda melhor. São poucos minutos:
                você dá uma nota de 0 a 10 para cada parte do evento e comenta o que quiser.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${data.surveyUrl}"
                       style="display:inline-block;background:#1B2B5E;color:#ffffff;text-decoration:none;
                              padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;">
                      Avaliar o evento
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px 0;color:#8a8070;font-size:12px;line-height:1.7;text-align:center;">
                Se o botão não funcionar, copie e cole este endereço no navegador:
              </p>
              <p style="margin:0;color:#1B2B5E;font-size:12px;line-height:1.6;text-align:center;word-break:break-all;">
                ${data.surveyUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1B2B5E;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#a0b0d0;font-size:11px;">
                Este e-mail foi enviado automaticamente por
                <strong style="color:#C9A84C;">inscrições.app</strong>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
  }

  private buildEmailHtml(
    data: RegistrationConfirmationData & {
      formattedDate: string;
      formattedTime: string;
      hasQr: boolean;
    },
  ): string {
    const amountRow =
      data.amountPaid && data.amountPaid > 0
        ? `<tr>
            <td style="padding:10px 0;border-bottom:1px solid #e5e0d6;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="color:#8a8070;font-size:13px;">Valor pago</td>
                <td style="text-align:right;color:#1B2B5E;font-size:15px;font-weight:700;">
                  R$ ${Number(data.amountPaid).toFixed(2).replace('.', ',')}
                </td>
              </tr></table>
            </td>
          </tr>`
        : '';

    const ticketRow = data.ticketName
      ? `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e0d6;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="color:#8a8070;font-size:13px;">Ingresso</td>
              <td style="text-align:right;color:#1f2937;font-size:13px;font-weight:600;">${data.ticketName}</td>
            </tr></table>
          </td>
        </tr>`
      : '';

    const qrSection = data.hasQr
      ? `<!-- QR Code -->
        <table width="100%" cellpadding="0" cellspacing="0"
               style="background:#F2EDE4;border-radius:12px;margin-bottom:24px;">
          <tr>
            <td style="padding:24px;text-align:center;">
              <p style="margin:0 0 4px 0;color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
                Código de Credenciamento
              </p>
              <img src="cid:qrcode@inscricoes" alt="QR Code" width="140" height="140"
                   style="display:block;margin:16px auto;border-radius:8px;" />
              <p style="margin:0;color:#1B2B5E;font-size:20px;font-weight:700;font-family:monospace;letter-spacing:4px;">
                ${data.registrationCode}
              </p>
              <p style="margin:8px 0 0 0;color:#8a8070;font-size:11px;">
                Apresente este QR code no credenciamento do evento
              </p>
            </td>
          </tr>
        </table>`
      : '';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirmação de Inscrição</title>
</head>
<body style="margin:0;padding:0;background:#F2EDE4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0"
               style="max-width:580px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(27,43,94,0.12);">

          <!-- Header -->
          <tr>
            <td style="background:#1B2B5E;padding:36px 40px;text-align:center;">
              <p style="margin:0 0 10px 0;color:#C9A84C;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">
                inscrições.app
              </p>
              <h1 style="margin:0 0 6px 0;color:#ffffff;font-size:26px;font-weight:700;">
                Inscrição Confirmada!
              </h1>
              <p style="margin:0;color:#a0b0d0;font-size:14px;">
                Olá, <strong style="color:#ffffff;">${data.participantName}</strong> — sua vaga está garantida.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">

              ${qrSection}

              <!-- Detalhes do evento -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#F2EDE4;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px 0;color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
                      Detalhes do Evento
                    </p>
                    <p style="margin:0 0 8px 0;color:#1B2B5E;font-size:18px;font-weight:700;">
                      ${data.eventTitle}
                    </p>
                    <p style="margin:0 0 4px 0;color:#5a6070;font-size:13px;">
                      📅 ${data.formattedDate} às ${data.formattedTime}
                    </p>
                    ${data.eventLocation
                      ? `<p style="margin:0;color:#5a6070;font-size:13px;">📍 ${data.eventLocation}</p>`
                      : ''}
                  </td>
                </tr>
              </table>

              <!-- Linha de detalhes -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                ${ticketRow}
                ${amountRow}
              </table>

              <!-- Aviso -->
              <p style="margin:0;color:#8a8070;font-size:12px;line-height:1.7;text-align:center;">
                Caso precise de ajuda, entre em contato com o organizador do evento.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1B2B5E;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#a0b0d0;font-size:11px;">
                Este e-mail foi enviado automaticamente por
                <strong style="color:#C9A84C;">inscrições.app</strong>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
  }
}
