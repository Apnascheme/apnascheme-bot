import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Health check route
app.get('/', (req, res) => {
  res.send('ApnaScheme Bot is running 🚀');
});

// Gupshup webhook endpoint (Updated to current API spec)
app.post('/gupshup', async (req, res) => {
  try {
    const { payload } = req.body;
    
    if (!payload?.source || !payload?.payload?.text) {
      console.error("Invalid payload structure:", JSON.stringify(req.body, null, 2));
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const sender = payload.source;
    const message = payload.payload.text.toLowerCase();

    console.log(`Incoming message from ${sender}: ${message}`);

    if (message === 'hi') {
      // Current Gupshup API v1 template message format
      const templatePayload = {
        channel: 'whatsapp',
        source: process.env.GUPSHUP_PHONE_NUMBER, // Your approved business number
        destination: sender,
        'src.name': 'ApnaSchemeTechnologies',
        template: JSON.stringify({
          id: 'welcome_user', // Must match EXACT template name in dashboard
          params: [] // Replace with actual template variables
        }),
        // For quick reply buttons:
        postbackTexts: JSON.stringify([
          {
            index: 0, // First button (0-indexed)
            text: "english_selected" // Postback value
          }
        ])
      };

      const response = await axios.post(
        'https://api.gupshup.io/wa/api/v1/template/msg', // Current endpoint
        new URLSearchParams(templatePayload),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'apikey': process.env.GUPSHUP_APP_TOKEN
          },
          timeout: 5000 // 5 second timeout
        }
      );

      console.log('Message submitted successfully:', {
        messageId: response.data.messageId,
        status: response.data.status,
        debugUrl: `https://www.gupshup.io/developer/reports?messageId=${response.data.messageId}`
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('API Request Failed:', {
      timestamp: new Date().toISOString(),
      error: error.response?.data || error.message,
      stack: error.stack,
      request: {
        url: error.config?.url,
        data: error.config?.data,
        headers: {
          ...error.config?.headers,
          apikey: '***REDACTED***' // Don't log real API keys
        }
      }
    });
    res.status(500).json({ error: 'Failed to process message' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Configuration:', {
    phoneNumber: process.env.GUPSHUP_PHONE_NUMBER,
    apiEndpoint: 'https://api.gupshup.io/wa/api/v1/template/msg'
  });
});
