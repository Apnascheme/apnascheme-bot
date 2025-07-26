import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BASE_URL = 'https://api.gupshup.io/sm/api/v1/msg';
const GUPSHUP_APP_TOKEN = process.env.GUPSHUP_APP_TOKEN;
const GUPSHUP_PHONE_NUMBER = process.env.GUPSHUP_PHONE_NUMBER;

const userContext = {}; // Temporary in-memory store

const QUESTIONS = {
  HI: [
    "Aapka gender kya hai? (Male/Female/Other)",
    "Aapki age kitni hai? (Numeric mein likhein eg. 18)",
    "Aap kya karte ho? (Student/Unemployed/Employed)",
    "Aapke Pitaji ki saalana income kitni hai? (eg. 120000)",
    "Kya aapke paas bank account hai? (Yes/No)",
    "Kya aapke paas ration card hai? (Yes/No)",
    "Kya aap kisi existing Sarkari Yojana ka labh le rahe ho? (Yes/No)",
    "Aapka rajya kaunsa hai? (eg. Maharashtra)",
    "Aap SC/ST/OBC/EWS category mein aate ho kya? (Yes/No)"
  ],
  EN: [
    "What is your gender? (Male/Female/Other)",
    "What is your age? (Enter number eg. 18)",
    "What do you do? (Student/Unemployed/Employed)",
    "What is your Father's yearly income? (eg. 120000)",
    "Do you have a bank account? (Yes/No)",
    "Do you have a ration card? (Yes/No)",
    "Which state do you live in? (eg. Maharashtra)",
    "Do you belong to SC/ST/OBC/EWS category? (Yes/No)"
  ],
  MR: [
    "तुमचं लिंग काय आहे? (Male/Female/Other)",
    "तुमचं वय किती आहे? (उदाहरण: 18)",
    "तुम्ही काय करता? (विद्यार्थी/बेरोजगार/नोकरी करता)",
    "पालकांचे वार्षिक उत्पन्न किती आहे? (उदा: 120000)",
    "तुमचं बँक खाते आहे का? (होय/नाही)",
    "तुमच्याकडे रेशन कार्ड आहे का? (होय/नाही)",
    "तुमचं राज्य कोणतं? (उदा: महाराष्ट्र)",
    "तुम्ही SC/ST/OBC/EWS प्रवर्गात मोडता का? (होय/नाही)"
  ]
};

const sendMessage = async (phone, msg) => {
  await axios.post(BASE_URL, null, {
    params: {
      channel: 'whatsapp',
      source: GUPSHUP_PHONE_NUMBER,
      destination: phone,
      message: msg,
      'src.name': 'ApnaSchemeTechnologies'
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      apikey: GUPSHUP_APP_TOKEN
    }
  });
};

const getNextQuestion = (user) => {
  const lang = user.language;
  const q = QUESTIONS[lang];
  const res = user.responses;

  if (res.length === 0) return q[0]; // Gender
  if (res.length === 1) return q[1]; // Age
  if (res.length === 2) return q[2]; // Occupation

  const occupation = res[2]?.toLowerCase();
  if ((occupation === 'student' || occupation === 'unemployed' || occupation === 'विद्यार्थी' || occupation === 'बेरोजगार') && res.length === 3) {
    return q[3]; // Guardian income
  }

  if (res.length === 3 && occupation === 'employed') return q[4]; // Bank account
  if (res.length === 4 && (occupation === 'student' || occupation === 'unemployed')) return q[4]; // Bank account after guardian income
  if (res.length === 5) return q[5]; // Ration card
  if (res.length === 6) return q[6]; // Existing yojana
  if (res.length === 7) return q[7]; // State
  if (res.length === 8) return q[8]; // Caste
  return null;
};

app.post('/gupshup', async (req, res) => {
  const data = req.body?.payload;
  const phone = data?.sender?.phone;
  const msg = data?.payload?.text?.toLowerCase().trim();

  if (!userContext[phone]) {
    if (msg.includes('hindi') || msg.includes('हिंदी')) userContext[phone] = { language: 'HI', responses: [] };
    else if (msg.includes('english')) userContext[phone] = { language: 'EN', responses: [] };
    else if (msg.includes('marathi') || msg.includes('मराठी')) userContext[phone] = { language: 'MR', responses: [] };
    else {
      await sendMessage(phone,"Namaste! Main hoon ApnaScheme – aapka digital dost 🇮🇳\nMain aapko batata hoon kaunsi Sarkari Yojana aapke liye hai – bina agent, bina form, bina confusion.\n\n🗣️ Apni bhaasha chunein:(1 ,2 ,3)\n1. हिंदी\n2. English\n3. मराठी");
      return res.sendStatus(200);
    }

    const firstQuestion = getNextQuestion(userContext[phone]);
    await sendMessage(phone, firstQuestion);
    return res.sendStatus(200);
  }

  const user = userContext[phone];
  user.responses.push(msg);

  const next = getNextQuestion(user);
  if (next) {
    await sendMessage(phone, next);
  } else {
    await sendMessage(phone, "Shukriya! Aapki saari jankari mil gayi hai. Ab hum aapke liye Yojana check karenge.");
    delete userContext[phone]; // Reset after flow
  }

  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.send('✅ ApnaScheme Bot is running with 3-language flow.');
});

app.listen(PORT, () => {
  console.log(`🚀 Server live on port ${PORT}`);
});
