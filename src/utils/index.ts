import axios from 'axios';
import { logger } from './logger';
import Mail from 'nodemailer/lib/mailer';
import { SENDER_EMAIL, SLACK_HOOK_URL } from '@/config';

export const splitAndTrimString = (str: string = '', sep: string = ',') => {
  return str
    .split(sep)
    .map(s => s.trim())
    .filter(s => s.length);
};

export const getSendEmailPayload = ({ to, subject, html }: Mail.Options): Mail.Options => {
  return {
    from: SENDER_EMAIL,
    to,
    subject,
    html,
  };
};

export const generateEmailContent = ({ path, method, status, message }) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #d9534f;">Internal Server Error</h2>
      <p>The <strong>'scrapper_zameen_backend'</strong> project encountered an internal server error. Details are below:</p>
      <ul style="list-style-type: none; padding: 0;">
        <li><strong>Request Path:</strong> ${path}</li>
        <li><strong>Request Method:</strong> ${method}</li>
        <li><strong>Response Status:</strong> ${status}</li>
        <li><strong>Error Message:</strong> ${message}</li>
      </ul>
    </div>
  `;
};

export const sendErrorMessageToSlack = ({ path, method, status, message }) => {
  const payload = {
    text:
      `<!channel> :rotating_light: *Internal Server Error* :rotating_light:\n\n` +
      `*Request Path:* ${path}\n` +
      `*Request Method:* ${method}\n` +
      `*Response Status:* ${status}\n` +
      `*Error Message:* ${message}\n\n` +
      `Please investigate this issue promptly.`,
  };

  return axios
    .post(SLACK_HOOK_URL, payload)
    .then(response => {
      logger.log('Message sent to Slack:', response.data);
    })
    .catch(error => {
      logger.error('Error sending message to Slack:', error);
    });
};
