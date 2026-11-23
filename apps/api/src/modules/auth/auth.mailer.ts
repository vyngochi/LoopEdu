import { Injectable } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

/** Sends the sign-in email over SMTP (Mailpit locally). Never log the address or the link. */
@Injectable()
export class AuthMailer {
  private transport?: Transporter;

  async sendMagicLink(to: string, link: string): Promise<void> {
    this.transport ??= createTransport(process.env.SMTP_URL ?? '');
    await this.transport.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: 'Đăng nhập LoopEdu',
      text: `Bấm vào liên kết để đăng nhập LoopEdu (hết hạn sau 15 phút, dùng một lần):\n\n${link}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.`,
    });
  }
}
