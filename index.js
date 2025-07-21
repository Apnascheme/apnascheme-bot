
require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();

// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Environment variables
const PORT = process.env.PORT || 3000;
const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY || 'sk_afb64b19fc4c4554977a91f412d02630';
const GUPSHUP_BOT_NAME = process.env.GUPSHUP_BOT_NAME || 'ApnaSchemeTechnologies';
const GUPSHUP_PHONE_NUMBER = process.env.GUPSHUP_PHONE_NUMBER || '917977594397';
const TEMPLATE_NAME = process.env.TEMPLATE_NAME || 'welcome_user';

// Gupshup API endpoint
const GUPSHUP_API_URL = 'https://api.gupshup.io/sm/api/v1/msg';

// Root route
app.get('/', (req, res) => {
  res.send('ApnaScheme Bot is running 🚀');
});

// Function to send template message via Gupshup
async function sendTemplateMessage(phoneNumber, templateName) {
  try {
    const payload = {
      source: GUPSHUP_PHONE_NUMBER,
      destination: phoneNumber,
      message: JSON.stringify({
        type: 'template',
        template: {
          id: templateName,
          params: []
        }
      }),
      'src.name': GUPSHUP_BOT_NAME
    };

    const config = {
      method: 'post',
      url: GUPSHUP_API_URL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': GUPSHUP_API_KEY
      },
      data: new URLSearchParams(payload)
    };

    console.log('Sending template message:', {
      to: phoneNumber,
      template: templateName,
      from: GUPSHUP_PHONE_NUMBER
    });

    const response = await axios(config);
    console.log('Gupshup API Response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('Error sending template message:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      phoneNumber,
      templateName
    });
    throw error;
  }
}

// Webhook endpoint to receive messages from Gupshup
app.post('/gupshup', async (req, res) => {
  try {
    console.log('Webhook received:', JSON.stringify(req.body, null, 2));
    
    const { type, payload } = req.body;
    
    // Check if it's an incoming message
    if (type === 'message' && payload) {
      const { source, payload: messagePayload } = payload;
      
      // Extract message text
      let messageText = '';
      if (messagePayload && messagePayload.type === 'text' && messagePayload.payload) {
        messageText = messagePayload.payload.text;
      }
      
      console.log(`Message from ${source}: ${messageText}`);
      
      // Check if user said "Hi" (case insensitive)
      if (messageText.toLowerCase().trim() === 'hi') {
        console.log('User said Hi, sending welcome template...');
        
        try {
          await sendTemplateMessage(source, TEMPLATE_NAME);
          console.log(`Successfully sent welcome template to ${source}`);
        } catch (sendError) {
          console.error('Failed to send welcome template:', sendError.message);
          // Continue execution even if sending fails
        }
      }
    }
    
    // Always respond with 200 to acknowledge receipt
    res.status(200).json({ 
      status: 'success', 
      message: 'Webhook processed successfully' 
    });
    
  } catch (error) {
    console.error('Webhook processing error:', {
      message: error.message,
      stack: error.stack,
      body: req.body
    });
    
    // Respond with error but don't fail the webhook
    res.status(200).json({ 
      status: 'error', 
      message: 'Webhook processed with errors',
      error: error.message 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`ApnaScheme Bot server is running on port ${PORT}`);
  console.log('Environment variables loaded:');
  console.log(`- PORT: ${PORT}`);
  console.log(`- GUPSHUP_BOT_NAME: ${GUPSHUP_BOT_NAME}`);
  console.log(`- GUPSHUP_PHONE_NUMBER: ${GUPSHUP_PHONE_NUMBER}`);
  console.log(`- TEMPLATE_NAME: ${TEMPLATE_NAME}`);
  console.log(`- GUPSHUP_API_KEY: ${GUPSHUP_API_KEY ? 'Set' : 'Not set'}`);
});

module.exports = app;
