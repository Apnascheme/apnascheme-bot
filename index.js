import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send('ApnaScheme Bot is running ');
});

// Webhook endpoint
app.post('/gupshup', async (req, res) => {

  console.log("Full incoming payload:", JSON.stringify(req.body, null, 2));

  
  const sender = req.body.payload?.source;
  const message = req.body.payload?.payload?.text;

  console.log(`Incoming message from ${sender} : ${message}`);

 
  if (message && message.toLowerCase() === 'Hi') {
    const msgParams = {
      channel: 'whatsapp',
      source: process.env.GUPSHUP_PHONE_NUMBER,
      destination: sender,
      'src.name': 'ApnaSchemeTechnologies',
      template: 'language_selection_v1',
      templateParams: '[]'
    };

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      apikey: process.env.GUPSHUP_APP_TOKEN
    };

    console.log("Sending message with params:");
    console.log(msgParams);
    console.log("Headers:");
    console.log(headers);

 try {
  const response = await axios.post(
    'https://api.gupshup.io/sm/api/v1/msg',
    new URLSearchParams(msgParams).toString(),
    { headers }
  );

  console.log(` Message sent successfully.`);
  console.log(` Gupshup response status: ${response.status}`);
  console.log( `Gupshup response data:, response.data`);
} catch (error) {
  console.error( `Error sending message:`);
  if (error.response) {
    console.error(`Status: ${error.response.status}`);
    console.error( `Data:, error.response.data`);
  } else {
    console.error(`error.message`);
  }
}
  res.sendStatus(200);
});

// Start server
app.listen(PORT, () => {
  console.log(` ApnaScheme bot server started on port ${PORT}`);
  console.log("Available at your primary URL https://apnascheme-bot.onrender.com");
  console.log('///////////////////////////////////////////////////////////\n');
});
