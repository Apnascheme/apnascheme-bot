import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import xlsx from 'xlsx';
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

// Load Excel data once on server start
const workbook = xlsx.readFile('./ApnaScheme_Phase1_50_Scheme_Template.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const schemes = xlsx.utils.sheet_to_json(sheet);

function filterSchemes(user) {
  return schemes.filter(scheme => {
    if (user.age < scheme['Min Age'] || user.age > scheme['Max Age']) return false;
    if (scheme['Income Limit'] && user.income > scheme['Income Limit']) return false;
    if (scheme['Caste Eligibility'] && scheme['Caste Eligibility'] !== 'Any') {
      if (user.caste !== scheme['Caste Eligibility']) return false;
    }
    if (scheme['Employment Filter'] && scheme['Employment Filter'] !== 'Any') {
      if (user.category !== scheme['Employment Filter']) return false;
    }
    if (scheme['Bank Account Required'] === 'Yes' && user.hasBankAccount === false) return false;
    if (scheme['Aadhaar Required'] === 'Yes' && user.hasAadhaar === false) return false;
    if (scheme['Target State'] && scheme['Target State'] !== 'All') {
      if (user.state !== scheme['Target State']) return false;
    }
    return true;
  });
}

app.use(express.json());

app.get('/', (req, res) => {
  res.send('ApnaScheme Bot is running 🚀');
});

app.post('/gupshup', async (req, res) => {
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
      return sendGupshupMessage(sender, { type: 'text', text: '2️⃣ Aapki age kya hai?' });

    case 'q2':
      ans.age = parseInt(message);
      state.step = 'q3';
      return sendGupshupMessage(sender, { type: 'text', text: '3️⃣ Aapki shaikshanik yogyata kya hai?' });

    case 'q3':
      ans.education = message;
      state.step = 'q4';
      return sendGupshupMessage(sender, { type: 'text', text: '4️⃣ Aap kis rajya mein rehte ho?' });

    case 'q4':
      ans.state = message;
      state.step = 'q5';
      return sendGupshupMessage(sender, { type: 'text', text: '5️⃣ Aapka caste kya hai?\n🔘 General\n🔘 OBC\n🔘 SC\n🔘 ST' });

    case 'q5':
      ans.caste = message;
      state.step = 'q6';
      return sendGupshupMessage(sender, { type: 'text', text: '6️⃣ Aapka varshik aay kya hai?' });

    case 'q6':
      ans.income = parseInt(message);
      state.step = 'q7';
      if (ans.age < 18) {
        ans.hasBankAccount = false;
        state.step = 'q8';
        return sendGupshupMessage(sender, { type: 'text', text: '7️⃣ Kya aapke paas Aadhaar card hai? (Yes/No)' });
      }
      return sendGupshupMessage(sender, { type: 'text', text: '7️⃣ Kya aapke paas bank account hai? (Yes/No)' });

    case 'q7':
      ans.hasBankAccount = message === 'yes';
      state.step = 'q8';
      return sendGupshupMessage(sender, { type: 'text', text: '8️⃣ Kya aapke paas Aadhaar card hai? (Yes/No)' });

    case 'q8':
      ans.hasAadhaar = message === 'yes';
      state.step = 'q9';
      return sendGupshupMessage(sender, {
        type: 'text',
        text: '9️⃣ Aap kis category mein aana pasand karenge?\n🔘 Student\n🔘 Farmer\n🔘 Labour\n🔘 Women\n🔘 Others',
      });

    case 'q9':
      ans.category = message;

      await db.collection('users').doc(sender).set({ ...ans, timestamp: Date.now() });

      const eligibleSchemes = filterSchemes(ans);
      state.eligibleSchemes = eligibleSchemes.map(s => `${s['Scheme Name']}\n${s['Official Link'] || 'No link'}`);
      state.step = 'eligible';

      return sendGupshupMessage(sender, {
        type: 'text',
        text: `✅ Aapke liye ${state.eligibleSchemes.length} Yojana mil rahi hai.\n\nYeh sabhi ka naam aur kaise apply karna hai – yeh aapko ₹49 payment ke baad turant mil jayega.`,
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

app.post('/razorpay-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.body.toString();
    const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (expectedSignature !== signature) return res.status(400).send('Invalid signature');

    const event = JSON.parse(rawBody);
    if (event.event === 'payment.captured') {
      const phone = event.payload.payment.entity.notes?.phone;
      if (phone && userStates[phone]) {
        const state = userStates[phone];
        await sendGupshupMessage(phone, {
          type: 'text',
          text: `✅ Payment received!\n\n🎉 Mubarak ho! Aapke liye yeh Yojana mil rahi hai:\n\n- ${state.eligibleSchemes.join('\n- ')}\n\nAgar aapko apply karne mein koi bhi madad chahiye, yahi WhatsApp par poochh sakte ho.`,
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
    // Use sandbox mode by default
    const isSandbox = true; // Set to false for production
    const source = isSandbox ? '14157386170' : process.env.GUPSHUP_PHONE_NUMBER;
    
    const payload = new URLSearchParams();
    payload.append('channel', 'whatsapp');
    payload.append('source', source);
    payload.append('destination', to);
    payload.append('message', JSON.stringify({
      ...message,
      text: isSandbox ? `[SANDBOX] ${message.text}` : message.text
    }));
    
    if (process.env.GUPSHUP_BOTNAME) {
      payload.append('src.name', process.env.GUPSHUP_BOTNAME);
    }

    const response = await axios.post(
      'https://api.gupshup.io/sm/api/v1/msg',
      payload.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'apikey': process.env.GUPSHUP_APP_TOKEN
        }
      }
    );
    
    console.log('Message sent:', {
      status: response.status,
      data: response.data,
      to,
      message: message.text
    });
  } catch (err) {
    console.error('Gupshup API Error:', {
      error: err.message,
      response: err.response?.data,
      config: {
        url: err.config?.url,
        data: err.config?.data,
        headers: {
          ...err.config?.headers,
          apikey: '[REDACTED]' // Hide full API key in logs
        }
      }
    });
  }
}

app.listen(PORT, () => {
  console.log(`ApnaScheme bot server started on port ${PORT}`);
  console.log(`     ==> Running in SANDBOX mode`);
  console.log(`     ==> Available at your primary URL https://apnascheme-bot.onrender.com\n`);
});
