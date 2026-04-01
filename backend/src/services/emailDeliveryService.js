import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import config from '../config/index.js';

const RESEND_API_URL = 'https://api.resend.com/emails';
const POSTMARK_API_URL = 'https://api.postmarkapp.com/email';

function buildHeaders(extra = {}) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...extra
  };
}

async function sendWithResend({ to, subject, text, html }) {
  if (!config.resendApiKey) {
    throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend.');
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: buildHeaders({ Authorization: `Bearer ${config.resendApiKey}` }),
    body: JSON.stringify({
      from: config.emailFromAddress,
      to: [to],
      reply_to: config.emailReplyToAddress || undefined,
      subject,
      text,
      html
    })
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Resend delivery failed (${response.status}): ${payload}`);
  }
}

async function sendWithPostmark({ to, subject, text, html }) {
  if (!config.postmarkServerToken) {
    throw new Error('POSTMARK_SERVER_TOKEN is required when EMAIL_PROVIDER=postmark.');
  }

  const response = await fetch(POSTMARK_API_URL, {
    method: 'POST',
    headers: buildHeaders({ 'X-Postmark-Server-Token': config.postmarkServerToken }),
    body: JSON.stringify({
      From: config.emailFromAddress,
      To: to,
      ReplyTo: config.emailReplyToAddress || undefined,
      Subject: subject,
      TextBody: text,
      HtmlBody: html,
      MessageStream: 'outbound'
    })
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Postmark delivery failed (${response.status}): ${payload}`);
  }
}

let sesClient = null;

function getSesClient() {
  if (sesClient) {
    return sesClient;
  }

  if (!config.sesRegion || !config.sesAccessKeyId || !config.sesSecretAccessKey) {
    throw new Error('AWS_SES_REGION, AWS_SES_ACCESS_KEY_ID, and AWS_SES_SECRET_ACCESS_KEY are required when EMAIL_PROVIDER=ses.');
  }

  sesClient = new SESv2Client({
    region: config.sesRegion,
    credentials: {
      accessKeyId: config.sesAccessKeyId,
      secretAccessKey: config.sesSecretAccessKey
    }
  });

  return sesClient;
}

async function sendWithSes({ to, subject, text, html }) {
  const client = getSesClient();
  await client.send(new SendEmailCommand({
    FromEmailAddress: config.emailFromAddress,
    Destination: { ToAddresses: [to] },
    ReplyToAddresses: config.emailReplyToAddress ? [config.emailReplyToAddress] : undefined,
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: text, Charset: 'UTF-8' },
          Html: { Data: html, Charset: 'UTF-8' }
        }
      }
    }
  }));
}

export async function sendAuthEmail(message) {
  switch (config.emailProvider) {
    case 'resend':
      return sendWithResend(message);
    case 'postmark':
      return sendWithPostmark(message);
    case 'ses':
      return sendWithSes(message);
    case 'noop':
      console.info('Auth email delivery skipped (EMAIL_PROVIDER=noop).', {
        to: message.to,
        subject: message.subject
      });
      return;
    default:
      throw new Error(`Unsupported EMAIL_PROVIDER: ${config.emailProvider}`);
  }
}

