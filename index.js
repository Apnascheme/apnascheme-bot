import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

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

  // Step 0: Language
  if (user.step === 0) {
    await sendGupshupMessage(sender,
      "Namaste! Main hoon ApnaScheme – aapka digital dost 🇮🇳\nMain aapko batata hoon kaunsi Sarkari Yojana aapke liye hai – bina agent, bina form, bina confusion.\n\n🗣️ Apni bhaasha chunein:\n1. हिंदी\n2. English\n3. मराठी"
    );
    user.step = 1;
  }

  else if (user.step === 1) {
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

  // Step 4: Employment
  else if (user.step === 4) {
    user.data.employment = incomingText;

    if (incomingText === '1' || incomingText === '2') {
      await sendGupshupMessage(sender,
        'Aapke guardian ki saalana aay kitni hai? (eg. 50000, 120000, 300000)'
      );
    } else {
      await sendGupshupMessage(sender,
        'Aapki saalana aay kitni hai? (eg. 50000, 120000, 300000)'
      );
    }
    user.step = 5;
  }

  // Step 5: Income
  else if (user.step === 5) {
    user.data.income = incomingText;

    if (user.data.age < 18) {
      user.step = 7;
      await sendGupshupMessage(sender, 'Aap SC/ST/OBC/EWS category mein aate ho kya? (Haan / Nahi)');
    } else {
      user.step = 6;
      await sendGupshupMessage(sender, 'Kya aapke paas bank account hai?\n1. Haan\n2. Nahin');
    }
  }

  // Step 6: Bank Account (18+ only)
  else if (user.step === 6) {
    user.data.bank = incomingText;
    user.step = 7;
    await sendGupshupMessage(sender, 'Aap SC/ST/OBC/EWS category mein aate ho kya? (Haan / Nahi)');
  }

  // Step 7: Caste Category
  else if (user.step === 7) {
    user.data.caste = incomingText;
    user.step = 8;
    await sendGupshupMessage(sender, 'Kya aap kisi disability se jujh rahe ho? (Haan / Nahi)');
 
  }

  // Step 9: Existing Scheme
  else if (user.step === 9) {
    user.data.existingYojana = incomingText;
    user.step = 10;
    await sendGupshupMessage(sender, 'Kya aapke paas ration card hai? (Haan / Nahi)');
  }

  // Step 10: Ration Card
  else if (user.step === 10) {
    user.data.rationCard = incomingText;
    user.step = 999;

    // End: Send payment link
    await sendGupshupMessage(sender,
      '✅ Aapke liye kaafi Yojanayein mil sakti hain!\n\nPuri jaankari ke liye ₹49 ka ek chhota charge hai.'
    );
    await sendGupshupMessage(sender,
      '⚠️ Note: ₹49 ek baar ka non-refundable charge hai.'
    );
    await sendGupshupMessage(sender, `💳 Pay karne ke liye click karein:\nhttps://rzp.io/rzp/razorpay49`);
  
    
  }

  // Step 999: Completed
  else if (user.step === 999) {
    await sendGupshupMessage(sender, '✅ Aapka response already record ho chuka hai. Payment ke baad puri report milegi.');
  }

  userState.set(sender, user);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`✅ ApnaScheme Bot running on port ${PORT}`);
});
