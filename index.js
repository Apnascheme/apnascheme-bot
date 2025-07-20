const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Test route
app.get('/', (req, res) => {
  res.send('ApnaScheme Bot is live!');
});

// Gupshup Webhook route
app.post('/gupshup', (req, res) => {
  const payload = req.body;

  // Verify if it's from your bot's number
  const phoneNumber = process.env.GUPSHUP_PHONE_NUMBER;

  // Safety check
  if (!payload || !payload.payload || !payload.payload.sender) {
    return res.status(400).send('Invalid payload');
  }

  const from = payload.payload.sender.phone;
  const message = payload.payload.payload.text;

  console.log(`📩 Incoming message from ${from}: ${message}`);

  // TODO: Add response logic here (next step)
  res.sendStatus(200); // Acknowledge Gupshup
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
