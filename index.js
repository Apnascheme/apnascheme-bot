import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';


dotenv.config();
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());


const LANGUAGE_QUESTIONS = {
  HI: {
    welcome: `Namaste! Main hoon ApnaScheme – aapka digital dost 🇮🇳
Main aapko batata hoon kaunsi Sarkari Yojana aapke liye hai –
bina agent, bina form, bina confusion.

🗣️ Apni bhaasha chunein:
🔘 हिंदी 🔘 English 🔘 मराठी`,
    questions: [
      { key: 'gender', text: 'Aapka gender kya hai? (👨‍🦰 Purush, 👩 Mahila, 🧕 Anya)' },
      { key: 'age', text: 'Aapki age kitni hai? (Numeric mein likhein eg. 18)' },
      { key: 'state', text: 'Aapka rajya kaunsa hai? (e.g. Maharashtra)' },
      { key: 'caste', text: 'Aap SC/ST/OBC/EWS category mein aate ho kya? (Haan/Nahi)' },
      { key: 'occupation', text: 'Aapka current occupation kya hai? (Student, Employed, Unemployed...)' },
      { key: 'income', text: 'Aapka ghar ka saalana aay kya hai? (₹ mein likho)' },
      { key: 'guardian_income', text: 'Aapke guardian ka annual income kitna hai? (₹ mein likho)' },
      { key: 'bank', text: 'Kya aapka bank account khula hai? (Haan/Nahi)' },
      { key: 'ration', text: 'Kya aapke paas ration card hai? (Haan/Nahi)' },
    ],
  },
  EN: {
    welcome: `Hello! I am ApnaScheme – your digital guide 🇮🇳
I’ll help you find which Government Schemes you’re eligible for –
no agents, no forms, no confusion.

🗣️ Choose your language:
🔘 हिंदी 🔘 English 🔘 मराठी`,
    questions: [
      { key: 'gender', text: 'What is your gender? (Male/Female/Other)' },
      { key: 'age', text: 'What is your age? (e.g. 25)' },
      { key: 'state', text: 'Which state do you live in? (e.g. Maharashtra)' },
      { key: 'caste', text: 'Do you belong to SC/ST/OBC/EWS category? (Yes/No)' },
      { key: 'occupation', text: 'What is your current occupation? (Student, Employed, Unemployed...)' },
      { key: 'income', text: 'What is your annual household income? (in ₹)' },
      { key: 'guardian_income', text: 'What is your guardian’s annual income? (in ₹)' },
      { key: 'bank', text: 'Do you have a bank account? (Yes/No)' },
      { key: 'ration', text: 'Do you have a ration card? (Yes/No)' },
    ],
  },
  MR: {
    welcome: `नमस्कार! मी आहे ApnaScheme – तुमचा डिजिटल साथी 🇮🇳
मी तुम्हाला सांगेल की कोणती शासकीय योजना तुमच्यासाठी आहे –
नो एजंट, नो फॉर्म, नो गोंधळ.

🗣️ आपली भाषा निवडा:
🔘 हिंदी 🔘 English 🔘 मराठी`,
    questions: [
      { key: 'gender', text: 'तुमचे लिंग काय आहे? (पुरुष/स्त्री/इतर)' },
      { key: 'age', text: 'तुमचे वय किती आहे? (उदा. २५)' },
      { key: 'state', text: 'तुम्ही कोणत्या राज्यात राहता? (उदा. महाराष्ट्र)' },
      { key: 'caste', text: 'तुम्ही SC/ST/OBC/EWS मधून आहात का? (होय/नाही)' },
      { key: 'occupation', text: 'तुमचा व्यवसाय काय आहे? (विद्यार्थी, नोकरी, बेरोजगार...)' },
      { key: 'income', text: 'तुमचे वार्षिक उत्पन्न किती आहे? (₹ मध्ये)' },
      { key: 'guardian_income', text: 'तुमच्या पालकांचे वार्षिक उत्पन्न किती आहे? (₹ मध्ये)' },
      { key: 'bank', text: 'तुमचे बँक खाते आहे का? (होय/नाही)' },
      { key: 'ration', text: 'तुमच्याकडे रेशन कार्ड आहे का? (होय/नाही)' },
    ],
  },
};

app.post('/gupshup', async (req, res) => {
  const incoming = req.body.payload?.payload;
  const phone = incoming?.sender?.phone;
  const message = incoming?.payload?.text?.toLowerCase().trim();
  if (!phone || !message) return res.sendStatus(200);

  const userRef = db.collection('users').doc(phone);
  let userData = (await userRef.get()).data() || {};

  // Set language
  if (!userData.language) {
    if (message.includes('hindi') || message.includes('हिंदी')) userData.language = 'HI';
    else if (message.includes('english') || message.includes('eng')) userData.language = 'EN';
    else if (message.includes('marathi') || message.includes('मराठी')) userData.language = 'MR';
    else {
      await sendMessage(phone, LANGUAGE_QUESTIONS.HI.welcome);
      return res.sendStatus(200);
    }
    userData.answers = {};
    userData.step = 0;
    await userRef.set(userData);
  }

  const lang = userData.language;
  const questions = LANGUAGE_QUESTIONS[lang].questions;

  // Store answer to last step
  if (userData.step > 0) {
    const lastKey = questions[userData.step - 1].key;
    userData.answers[lastKey] = message;
  }

  // Skip logic
  if (questions[userData.step]?.key === 'income' && ['student', 'unemployed', 'विद्यार्थी', 'बेरोजगार'].includes(userData.answers['occupation']?.toLowerCase())) {
    userData.step++; // skip income
  }
  if (questions[userData.step]?.key === 'bank' && parseInt(userData.answers['age']) < 18) {
    userData.step++; // skip bank
  }

  // Ask next question
  if (userData.step < questions.length) {
    const nextQ = questions[userData.step].text;
    await sendMessage(phone, nextQ);
    userData.step++;
    await userRef.set(userData);
  } else {
    await sendMessage(phone, '✅ Thank you! We are checking schemes you are eligible for...');
    // You can add further logic here for eligibility check/payment etc.
  }

  res.sendStatus(200);
});

async function sendMessage(to, msg) {
  await axios.post(
    'https://api.gupshup.io/sm/api/v1/msg',
    new URLSearchParams({
      channel: 'whatsapp',
      source: process.env.GUPSHUP_PHONE_NUMBER,
      destination: to,
      message: JSON.stringify({ type: 'text', text: msg }),
    }),
    {
      headers: {
        'apikey': process.env.GUPSHUP_APP_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
}

app.listen(PORT, () => {
  console.log(`✅ ApnaScheme bot server running on port ${PORT}`);
});
