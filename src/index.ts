import 'dotenv/config';
import express from 'express';
import cron from 'node-cron';
import { runDailyDigest } from './workflow';

const app = express();
app.use(express.json());

// Resend Webhook Endpoint
app.post('/api/webhooks/resend', (req, res) => {
  const event = req.body;
  console.log('Received Resend Webhook:', event.type, event.data?.email_id);
  // Log or handle the bounce/delivery event.
  // In a full implementation, the supervisor would read these logs.
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Jarvis Digest service started. Cron scheduled for 09:00 IST daily.');
});

// Run daily at 09:00 IST
cron.schedule('0 9 * * *', async () => {
  console.log('Cron triggered: Starting Jarvis Digest workflow...');
  try {
    await runDailyDigest();
  } catch (error) {
    console.error('Fatal error in cron workflow execution:', error);
  }
}, {
  timezone: "Asia/Kolkata"
});
