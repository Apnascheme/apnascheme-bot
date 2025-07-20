const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Home route
app.get('/', (req, res) => {
  res.send('ApnaScheme Bot is running!');
});

// ✅ Gupshup webhook POST handler
app.post('/gupshup', (req, res) => {
  console.log('📨 Webhook received from Gupshup:', req.body);

  // Always respond 200 to acknowledge receipt
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
