import { Resend } from 'resend';
import { ProcessedItem } from '../models/types';

export async function sendDailyDigest(items: ProcessedItem[]) {
  if (items.length === 0) {
    console.log('No items to send today.');
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  const toEmails = new Set<string>();
  if (process.env.RESEND_TO_EMAIL) {
    process.env.RESEND_TO_EMAIL.split(',').forEach((e) => {
      if (e.trim()) toEmails.add(e.trim());
    });
  } else {
    toEmails.add('bsaiprasad13@gmail.com');
    toEmails.add('hariharsatwik03@gmail.com');
  }

  if (!fromEmail || toEmails.size === 0) {
    console.error('RESEND_FROM_EMAIL or toEmails is missing');
    return;
  }

  const html = generateEmailHtml(items);

  try {
    const data = await resend.emails.send({
      from: `Jarvis Digest <${fromEmail}>`,
      to: Array.from(toEmails),
      subject: `JARVIS - AI NEWS REPORTER - ${new Date().toLocaleDateString()}`,
      html: html,
    });
    console.log('Email sent successfully:', data);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

function generateEmailHtml(items: ProcessedItem[]): string {
  const itemsHtml = items
    .map(
      (item) => `
    <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="margin-top: 0; margin-bottom: 8px; font-size: 18px;">
        <a href="${item.url}" style="color: #2563eb; text-decoration: none;">${item.title}</a>
      </h2>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #4b5563;">
        <strong>Summary:</strong> ${item.llmSummary}
      </p>
      <p style="margin: 0 0 12px 0; font-size: 14px; color: #4b5563;">
        <strong>Why it matters:</strong> ${item.pmRelevance}
      </p>
      <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
        Source: ${item.source} ${item.score ? `| Score: ${item.score}` : ''}
      </div>
      <div>
        ${item.tags
          .map(
            (tag) =>
              `<span style="display: inline-block; background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 4px; margin-bottom: 4px;">${tag}</span>`,
          )
          .join('')}
      </div>
    </div>
  `,
    )
    .join('');

  return `
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #111827; text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">JARVIS - AI NEWS REPORTER</h1>
        <p style="text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 32px;">
          Your curated list of PM tools and news for ${new Date().toLocaleDateString()}
        </p>
        ${itemsHtml}
      </body>
    </html>
  `;
}
