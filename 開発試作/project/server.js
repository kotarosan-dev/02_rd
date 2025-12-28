import express from 'express';
import { WebhookEvent, middleware } from '@line/bot-sdk';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const config = {
  channelAccessToken: process.env.VITE_LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.VITE_LINE_CHANNEL_SECRET
};

app.use(cors());
app.use(express.json());
app.use('/webhook', middleware(config));

app.get('/', (req, res) => {
  res.send('LINE Webhook Server is running!');
});

app.post('/webhook', async (req, res) => {
  try {
    const events = req.body.events;
    console.log('Received events:', events);

    await Promise.all(
      events.map(async (event) => {
        if (event.type === 'message' && event.message.type === 'text') {
          console.log('Processing message:', event.message.text);
        }
      })
    );

    res.status(200).end();
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).end();
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});