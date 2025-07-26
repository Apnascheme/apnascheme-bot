import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// State to track user progress
const userState = new Map();

async function sendGupshupMessage(destination, text) {
  const params = new URLSearchParams({
    channel: 'whatsapp',
    source: process.env.GUPSHUP_PHONE_NUMBER,
    destination: destination,
    'src.name': 'ApnaSchemeTechnologies',
    message: JSON.stringify({ type: 'text', text: text })
  });

  try {
    await axios.post(
      'https://api.gupshup.io/sm/api/v1/msg',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          apikey: process.env.GUPSHUP_APP_TOKEN
        }
      }
    );
  } catch (error) {
    console.error("❌ Error sending message:", error.response?.data || error.message);
  }
}

app.post('/gupshup', async (req, res) => {
  const payload = req.body.payload;
  if (!payload || !payload.source || !payload.payload?.text) {
    return res.sendStatus(400);
  }

  const sender = payload.source;
  const incomingText = payload.payload.text.trim().toLowerCase();

  let user = userState.get(sender) || { step: 0, data: {} };

  // Step 0: Language Selection
  if (user.step === 0) {
    await sendGupshupMessage(sender,
      "Namaste! Main hoon ApnaScheme – aapka digital dost 🇮🇳\nMain aapko batata hoon kaunsi Sarkari Yojana aapke liye hai – bina agent, bina form, bina confusion.\n\n🗣️ Apni bhaasha chunein:\n1. हिंदी\n2. English\n3. मराठी"
    );
    user.step = 1;
  } else if (user.step === 1) {
    if (incomingText === '1' || incomingText === 'hindi') {
      user.language = 'hindi';
      await sendGupshupMessage(sender, 'Aapne Hindi chuni hai. Aaiye shuru karte hain aapki Yojana jaankari!');
      await sendGupshupMessage(sender, 'Aapka gender kya hai?\n1. Purush\n2. Mahila\n3. Anya');
      user.step = 2;
    } else {
      await sendGupshupMessage(sender, 'Kripya 1 (Hindi), 2 (English), ya 3 (Marathi) mein se chunav karein.');
    }
  }

  // Step 2: Gender
  else if (user.step === 2) {
    user.data.gender = incomingText;
    await sendGupshupMessage(sender, 'Aapki age kitni hai? (Numeric mein likhein eg. 18)');
    user.step = 3;
  }

  // Step 3: Age
  else if (user.step === 3) {
    user.data.age = parseInt(incomingText);
    if (isNaN(user.data.age)) {
      await sendGupshupMessage(sender, 'Kripya apni age sirf number mein bhejein (jaise 18)');
    } else {
      await sendGupshupMessage(sender,
        'Aap kya karte hain?\n1. Student\n2. Unemployed\n3. Private Job\n4. Government Job\n5. Self-Employed'
      );
      user.step = 4;
    }
  }

  // Step 4: Employment Status
  else if (user.step === 4) {
    user.data.employment = incomingText;

    if (incomingText === '1' || incomingText === '2') {
      // Student or Unemployed – skip income, ask about guardian income
      await sendGupshupMessage(sender,
        'Aapke guardian ki saalana aay kitni hai? (eg. 50000, 120000, 300000)'
      );
      user.step = 5;
    } else {
      // Ask about user's own income
      await sendGupshupMessage(sender, 'Aapki saalana aay kitni hai? (eg. 50000, 120000, 300000)');
      user.step = 5;
    }
  }

  // Step 5: Income
  else if (user.step === 5) {
    user.data.income = incomingText;

    if (user.data.age < 18) {
      // Skip bank account question
      await sendGupshupMessage(sender,
        '✅ Apke liye 4 Sarkari Yojana mil sakti hain.\n\nLekin puri jaankari aur personal madad ke liye ₹49 ka ek chhota charge hai.'
      );
      await sendGupshupMessage(sender,
        '⚠️ Kripya note karein: ₹49 ek baar ka non-refundable charge hai.'
      );
      await sendGupshupMessage(sender, `✅ Pay karne ke liye yeh link kholen:\nhttps://rzp.io/l/apnascheme49`);
      await sendGupshupMessage(sender, `Apne doston ko bhejein:\nhttps://wa.me/?text=🇮🇳 Kaunsi Sarkari Yojana aapke liye hai?\n\n✅ WhatsApp pe free check karo\n💸 Puri madad bhi milegi (₹49 mein)\n👉 wa.me/91${process.env.GUPSHUP_PHONE_NUMBER}?text=Hi`);
      user.step = 999;
    } else {
      await sendGupshupMessage(sender, 'Kya aapke paas bank account hai?\n1. Haan\n2. Nahin');
      user.step = 6;
    }
  }

  // Step 6: Bank Account (only if age >= 18)
  else if (user.step === 6) {
    user.data.bank = incomingText;

    await sendGupshupMessage(sender,
      '✅ Apke liye  Sarkari Yojana mil sakti hain.\n\nLekin puri jaankari ke liye ₹49 charge hai.'
    );
    await sendGupshupMessage(sender,
      '⚠️ Kripya note karein: ₹49 ek baar ka non-refundable charge hai.'
    );
    await sendGupshupMessage(sender, `✅ Pay karne ke liye yeh link kholen:\nhttps://rzp.io/rzp/razorpay49`);
    await sendGupshupMessage(sender, `Apne doston ko bhejein:\nhttps://wa.me/?text=🇮🇳 Kaunsi Sarkari Yojana aapke liye hai?\n\n✅ WhatsApp pe free check karo\n💸 Puri madad bhi milegi (₹49 mein)\n👉 wa.me/91${process.env.GUPSHUP_PHONE_NUMBER}?text=Hi`);
    user.step = 999;
  }

  // Step 999: Already completed
  else if (user.step === 999) {
    await sendGupshupMessage(sender, 'Aapne pehle hi ₹49 process dekh liya hai. Payment ke baad aapko puri list mil jaayegi.');
  }

  userState.set(sender, user);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`✅ Server started on port ${PORT}`);
});
