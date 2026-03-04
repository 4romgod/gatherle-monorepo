import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { AWS_REGION, EMAIL_FROM, WEBAPP_URL, STAGE } from '@/constants';
import { APPLICATION_STAGES } from '@gatherle/commons';
import { logger } from '@/utils/logger';

const isLocalDev = STAGE === APPLICATION_STAGES.DEV;

const sesClient = isLocalDev ? null : new SESClient({ region: AWS_REGION });

class EmailService {
  /**
   * Send an email verification link.
   *
   * In Dev mode the link is logged to the console instead of sent.
   */
  static async sendEmailVerification(toEmail: string, plainToken: string): Promise<void> {
    const verifyUrl = `${WEBAPP_URL}/auth/verify-email?token=${encodeURIComponent(plainToken)}`;

    if (isLocalDev || !sesClient) {
      logger.info(`[EmailService] DEV — email verification link for ${toEmail}: ${verifyUrl}`);
      return;
    }

    const subject = 'Verify your Gatherle email address';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email</h2>
        <p>Thanks for signing up! Click the button below to verify your email address.</p>
        <p>
          <a href="${verifyUrl}"
             style="background:#1e88e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
            Verify Email
          </a>
        </p>
        <p>Or copy and paste this link into your browser:<br/><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>This link expires in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `;
    const text = `Verify your email by visiting this link: ${verifyUrl}\n\nThis link expires in 24 hours.`;

    try {
      await sesClient.send(
        new SendEmailCommand({
          Source: EMAIL_FROM,
          Destination: { ToAddresses: [toEmail] },
          Message: {
            Subject: { Data: subject },
            Body: {
              Html: { Data: html },
              Text: { Data: text },
            },
          },
        }),
      );
      logger.info(`[EmailService] Verification email sent to ${toEmail}`);
    } catch (error) {
      logger.error(`[EmailService] Failed to send verification email to ${toEmail}`, { error });
      throw error;
    }
  }

  /**
   * Send a password reset link.
   *
   * In Dev mode the link is logged to the console instead of sent.
   */
  static async sendPasswordReset(toEmail: string, plainToken: string): Promise<void> {
    const resetUrl = `${WEBAPP_URL}/auth/reset-password?token=${encodeURIComponent(plainToken)}`;

    if (isLocalDev || !sesClient) {
      logger.info(`[EmailService] DEV — password reset link for ${toEmail}: ${resetUrl}`);
      return;
    }

    const subject = 'Reset your Gatherle password';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>We received a request to reset the password for your account.</p>
        <p>
          <a href="${resetUrl}"
             style="background:#1e88e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
            Reset Password
          </a>
        </p>
        <p>Or copy and paste this link into your browser:<br/><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `;
    const text = `Reset your Gatherle password by visiting this link: ${resetUrl}\n\nThis link expires in 1 hour.`;

    try {
      await sesClient.send(
        new SendEmailCommand({
          Source: EMAIL_FROM,
          Destination: { ToAddresses: [toEmail] },
          Message: {
            Subject: { Data: subject },
            Body: {
              Html: { Data: html },
              Text: { Data: text },
            },
          },
        }),
      );
      logger.info(`[EmailService] Password reset email sent to ${toEmail}`);
    } catch (error) {
      logger.error(`[EmailService] Failed to send password reset email to ${toEmail}`, { error });
      throw error;
    }
  }
}

export default EmailService;
