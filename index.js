


const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
const GUPSHUP_SOURCE = process.env.GUPSHUP_SOURCE;
const GUPSHUP_APP_NAME = process.env.GUPSHUP_APP_NAME;

app.get('/', (req, res) => {
    res.json({ message: 'ApnaScheme Bot is running 🚀' });
});

app.post('/webhook', async (req, res) => {
    try {
        const payload = req.body;
        
        console.log('Received webhook payload:', JSON.stringify(payload, null, 2));
        
        if (payload.type === 'message') {
            const messageData = payload.payload;
            const userNumber = messageData.source;
            const messageText = messageData.payload?.text || '';
            
            console.log(`Processing message from ${userNumber}: ${messageText}`);
            
            if (messageText.toLowerCase().trim() === 'hi') {
                console.log('Detected "Hi" message, sending welcome template');
                
                const templateResponse = await sendTemplateMessage(userNumber, 'welcome_user');
                
                if (templateResponse.status === 'submitted') {
                    console.log(`Successfully sent welcome template to ${userNumber}`);
                } else {
                    console.error('Failed to send template message:', templateResponse);
                }
            }
        }
        
        res.json({ 
            status: 'success', 
            message: 'Webhook processed successfully' 
        });
        
    } catch (error) {
        console.error('Error processing webhook:', error.message);
        console.error('Stack trace:', error.stack);
        
        res.status(500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
});

async function sendTemplateMessage(destination, templateName) {
    try {
        const url = 'https://api.gupshup.io/sm/api/v1/template/msg';
        
        const headers = {
            'apikey': GUPSHUP_API_KEY,
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        
        const params = new URLSearchParams({
            'source': GUPSHUP_SOURCE,
            'destination': destination,
            'src.name': GUPSHUP_APP_NAME,
            'template': JSON.stringify({
                id: templateName,
                params: []
            })
        });
        
        console.log(`Sending template message to ${destination} with template ${templateName}`);
        console.log('Request params:', params.toString());
        
        const response = await axios.post(url, params, { headers });
        
        console.log('Gupshup API response:', response.data);
        return response.data;
        
    } catch (error) {
        console.error('Error sending template message:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        return { 
            status: 'error', 
            message: error.message 
        };
    }
}

app.post('/test-template', async (req, res) => {
    try {
        const { destination, template = 'welcome_user' } = req.body;
        
        if (!destination) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Destination number is required' 
            });
        }
        
        const result = await sendTemplateMessage(destination, template);
        res.json({ status: 'success', response: result });
        
    } catch (error) {
        console.error('Error in test template endpoint:', error.message);
        res.status(500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        config: {
            botName: GUPSHUP_APP_NAME,
            phoneNumber: GUPSHUP_SOURCE,
            hasApiKey: !!GUPSHUP_API_KEY
        }
    });
});

app.use((error, req, res, next) => {
    console.error('Unhandled error:', error.message);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({ 
        status: 'error', 
        message: 'Internal server error' 
    });
});

app.use('*', (req, res) => {
    res.status(404).json({ 
        status: 'error', 
        message: 'Route not found' 
    });
});

app.listen(PORT, () => {
    console.log(`🚀 ApnaScheme Bot is running on port ${PORT}`);
    console.log(`Bot Name: ${GUPSHUP_APP_NAME}`);
    console.log(`Phone Number: ${GUPSHUP_SOURCE}`);
    console.log(`API Key configured: ${!!GUPSHUP_API_KEY}`);
    console.log('Available endpoints:');
    console.log(`  GET  / - Bot status`);
    console.log(`  POST /webhook - Gupshup webhook`);
    console.log(`  POST /test-template - Test template sending`);
    console.log(`  GET  /health - Health check`);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down ApnaScheme Bot...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down ApnaScheme Bot...');
    process.exit(0);
});
