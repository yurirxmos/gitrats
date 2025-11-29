import { getResendClient } from "./resend-client";

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  from?: string;
  templateId?: string;
  templateData?: Record<string, any>;
}

export class EmailService {
  private static defaultFrom = "GitRats <contact@rxmos.dev.br>";

  /**
   * Envia um e-mail usando Resend (com template ou HTML)
   */
  static async sendEmail({ to, subject, html, from, templateId, templateData }: SendEmailParams) {
    try {
      const emailPayload: any = {
        from: from || this.defaultFrom,
        to,
        subject,
      };

      // Se tem templateId, usa template do Resend
      if (templateId) {
        emailPayload.react = templateId;
        if (templateData) {
          emailPayload.props = templateData;
        }
      } else if (html) {
        // Senão, usa HTML direto
        emailPayload.html = html;
      } else {
        throw new Error("É necessário fornecer html ou templateId");
      }

      const resendClient = getResendClient();
      const { data, error } = await resendClient.emails.send(emailPayload);

      if (error) {
        console.error("Erro ao enviar e-mail:", error);
        throw new Error(`Falha ao enviar e-mail: ${error.message}`);
      }

      return { success: true, data };
    } catch (error) {
      console.error("Erro no serviço de e-mail:", error);
      throw error;
    }
  }

  /**
   * Envia e-mail de convite para guilda
   */
  static async sendGuildInviteEmail(
    to: string,
    invitedUsername: string,
    guildName: string,
    guildTag: string,
    inviterUsername: string,
    inviteId: string
  ) {
    // HTML gerado via código para evitar dependência do editor de templates do Resend
    const { buildGuildInviteEmail } = await import("./email-templates/guild-invite");
    const html = buildGuildInviteEmail({
      invitedUsername,
      guildName,
      guildTag,
      inviterUsername,
      acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/guild?invite=${inviteId}`,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "",
    });
    return this.sendEmail({
      to,
      subject: `Convite para guilda: ${guildName}`,
      html,
    });
  }

}
