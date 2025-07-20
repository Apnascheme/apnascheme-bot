const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Health check
app.get('/', (req, res) => {
  res.send('ApnaScheme Bot is running!');
});

// ✅ Gupshup Webhook endpoint
app.post('/gupshup', (req, res) => {
  console.log('📨 Webhook received from Gupshup:', req.body);

  // Respond with 200 so Gupshup knows it's valid
  res.status(200).send('Webhook received');
});

app.listen(PORT, () => {
  console.log(`✅ Server live on http://localhost:${PORT}`);
});
