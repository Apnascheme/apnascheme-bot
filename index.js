import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;


initializeApp({
  credential: applicationDefault(),
});
const db = getFirestore();

const userStates = {};
const referralNumber = '7977594397';

app.get('/', (req, res) => {
  res.send('ApnaScheme Bot is running 🚀');
});

app.post('/gupshup-webhook', async (req, res) => {
  const body = req.body;
  const sender = body.payload?.sender?.phone;
  const message = body.payload?.payload?.text?.toLowerCase();

  if (!sender || !message) return res.sendStatus(200);

  userStates[sender] = userStates[sender] || { step: 'lang', answers: {} };
  const state = userStates[sender];
  const ans = state.answers;

  switch (state.step) {
    case 'lang':
      state.step = 'q1';
      return sendGupshupMessage(sender, {
        type: 'text',
        text: '1️⃣ Aapka gender kya hai?\n🔘 Male\n🔘 Female\n🔘 Dusra',
      });

    case 'q1':
      ans.gender = message;
      state.step = 'q2';
      return sendGupshupMessage(sender, {
        type: 'text',
        text: '2️⃣ Aapki age kya hai?',
      });

    case 'q2':
      ans.age = message;
      state.step = 'q3';
      return sendGupshupMessage(sender, {
        type: 'text',
        text: '3️⃣ Aapki shaikshanik yogyata kya hai?',
      });

    case 'q3':
      ans.education = message;
      state.step = 'q4';
      return sendGupshupMessage(sender, {
        type: 'text',
        text: '4️⃣ Aap kis rajya mein rehte ho?',
      });

    case 'q4':
      ans.state = message;
      state.step = 'q5';
      return sendGupshupMessage(sender, {
        type: 'text',
        text: '5️⃣ Aapka caste kya hai?\n🔘 General\n🔘 OBC\n🔘 SC\n🔘 ST',
      });

    case 'q5':
      ans.caste = message;
      state.step = 'q6';
      return sendGupshupMessage(sender, {
        type: 'text',
        text: '6️⃣ Aapka varshik aay kya hai?',
      });

    case 'q6':
      ans.income = message;
      state.step = 'q7';
      if (parseInt(ans.age) < 18) {
        ans.bankAccount = 'N/A';
        state.step = 'q8';
        return sendGupshupMessage(sender, {
          type: 'text',
          text: '7️⃣ Kya aapke paas Aadhaar card hai? (Yes/No)',
        });
      }
      return sendGupshupMessage(sender, {
        type: 'text',
        text: '7️⃣ Kya aapke paas bank account hai? (Yes/No)',
      });

    case 'q7':
      ans.bankAccount = message;
      state.step = 'q8';
      return sendGupshupMessage(sender, {
        type: 'text',
        text: '8️⃣ Kya aapke paas Aadhaar card hai? (Yes/No)',
      });

    case 'q8':
      ans.aadhaar = message;
      state.step = 'q9';
      return sendGupshupMessage(sender, {
        type: 'text',
        text: '9️⃣ Aap kis category mein aana pasand karenge?\n🔘 Student\n🔘 Farmer\n🔘 Labour\n🔘 Women\n🔘 Others',
      });

    case 'q9':
      ans.category = message;

      // 🔥 Save to Firestore here
      await db.collection('users').doc(sender).set({
        ...ans,
        timestamp: Date.now(),
      });

      // ✅ Lock dummy logic
      const eligibleSchemes = ['PMAY', 'NSP Scholarship', 'E-Shram Card', 'Kisan Samman Nidhi'];
      state.eligibleSchemes = eligibleSchemes;
      state.step = 'eligible';
      return sendGupshupMessage(sender, {
        type: 'text',
        text: `✅ Aapke liye ${eligibleSchemes.length} Yojana mil rahi hai.\n\nYeh sabhi ka naam aur kaise apply karna hai – yeh aapko ₹49 payment ke baad turant mil jayega.`,
      });

    case 'eligible':
      return sendGupshupMessage(sender, {
        type: 'text',
        text: `⚠️ ₹49 ek baar ka seva charge hai – yeh non-refundable hai.\n\nContinue karne ke liye yeh link par payment karein:\n\nhttps://rzp.io/l/abc123?notes[phone]=${sender}`,
      });

    default:
      return sendGupshupMessage(sender, {
        type: 'text',
        text: 'Namaste! Main hoon ApnaScheme – aapka digital dost 🇮🇳\nMain aapko batata hoon kaunsi Sarkari Yojana aapke liye hai –\nbina agent, bina form, bina confusion.\n\n🗣️ Apni bhaasha chunein:\n🔘 हिंदी 🔘 English 🔘 मराठी',
      });
  }
});

// ✅ Razorpay webhook route
app.post('/razorpay-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

   const rawBody = req.body.toString(); 
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) return res.status(400).send('Invalid signature');

    const event = JSON.parse(rawBody);

    if (event.event === 'payment.captured') {
      const phone = event.payload.payment.entity.notes?.phone;
      if (phone && userStates[phone]) {
        const state = userStates[phone];
        await sendGupshupMessage(phone, {
          type: 'text',
          text: `✅ Payment received!\n\n🎉 Mubarak ho! Aapke liye yeh 4 Yojana mil rahi hai:\n\n- ${state.eligibleSchemes.join('\n- ')}\n\nAgar aapko apply karne mein koi bhi madad chahiye, yahi WhatsApp par poochh sakte ho.`,
        });
        await sendGupshupMessage(phone, {
          type: 'text',
          text: `Apne doston ko bhi madad do – Apna referral link unko bhejein:\n👉 wa.me/${referralNumber}?text=Hi`,
        });
        resetUser(phone);
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook Error:', err);
    res.status(500).send('Server error');
  }
});

function resetUser(phone) {
  delete userStates[phone];
}

async function sendGupshupMessage(to, message) {
  try {
    await axios.post('https://api.gupshup.io/sm/api/v1/msg', {
      channel: 'whatsapp',
      source: process.env.GUPSHUP_PHONE_ID,
      destination: to,
      message,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.GUPSHUP_API_KEY,
      },
    });
  } catch (err) {
    console.error('Gupshup Send Error:', err.response?.data || err.message);
  }
}
app.use(express.json());
app.listen(PORT, () => {
  console.log(`ApnaScheme bot server started on port ${PORT}`);
  console.log(`     ==> Your service is live 🎉`);
  console.log(`     ==> \n     ==> Available at your primary URL https://apnascheme-bot.onrender.com\n`);
});
