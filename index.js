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
  1: [
    "आपका लिंग क्या है?\n1. पुरुष\n2. महिला\n3. अन्य",
    "आपकी उम्र कितनी है? (केवल संख्या में लिखें, जैसे: 18)",
    "आप क्या करते हैं?\n1. छात्र\n2. बेरोज़गार\n3. नौकरीपेशा\n4. अन्य",
    "आपके माता-पिता की सालाना आय कितनी है? (केवल संख्या में लिखें, जैसे: 120000)",
    "क्या आपका बैंक खाता है?\n1. हाँ\n2. नहीं",
    "क्या आपके पास राशन कार्ड है?\n1. हाँ\n2. नहीं",
    "आपका राज्य कौन सा है? (उदाहरण: महाराष्ट्र)",
    "क्या आप SC/ST/OBC/EWS श्रेणी में आते हैं?\n1. हाँ\n2. नहीं"
  ],
  2: [
    "What is your gender?\n1. Male\n2. Female\n3. Other",
    "What is your age? (Enter number eg. 18)",
    "What do you do?\n1. Student\n2. Unemployed\n3. Employed\n4. Other",
    "What is your Parent's yearly income? (eg. 120000)",
    "Do you have a bank account?\n1. Yes\n2. No",
    "Do you have a ration card?\n1. Yes\n2. No",
    "Which state do you live in? (eg. Maharashtra)",
    "Do you belong to SC/ST/OBC/EWS category?\n1. Yes\n2. No"
  ],
  3: [
    "तुमचं लिंग काय आहे?\n1. Male\n2. Female\n3. Other",
    "तुमचं वय किती आहे? (उदाहरण: 18)",
    "तुम्ही काय करता?\n1. विद्यार्थी\n2. बेरोजगार\n3. नोकरी करता\n4. इतर",
    "पालकांचे वार्षिक उत्पन्न किती आहे? (उदा: 120000)",
    "तुमचं बँक खाते आहे का?\n1. होय\n2. नाही",
    "तुमच्याकडे रेशन कार्ड आहे का?\n1. होय\n2. नाही",
    "तुमचं राज्य कोणतं? (उदा: महाराष्ट्र)",
    "तुम्ही SC/ST/OBC/EWS प्रवर्गात मोडता का?\n1. होय\n2. नाही"
  ]
};

const OPTION_MAPPINGS = {
  1: {
    0: { '1': 'पुरुष', '2': 'महिला', '3': 'अन्य' },
    2: { '1': 'छात्र', '2': 'बेरोज़गार', '3': 'नौकरीपेशा', '4': 'अन्य' },
    4: { '1': 'हाँ', '2': 'नहीं' },
    5: { '1': 'हाँ', '2': 'नहीं' },
    7: { '1': 'हाँ', '2': 'नहीं' }
  },
  2: {
    0: { '1': 'Male', '2': 'Female', '3': 'Other' },
    2: { '1': 'Student', '2': 'Unemployed', '3': 'Employed', '4': 'Other' },
    4: { '1': 'Yes', '2': 'No' },
    5: { '1': 'Yes', '2': 'No' },
    7: { '1': 'Yes', '2': 'No' }
  },
  3: {
    0: { '1': 'Male', '2': 'Female', '3': 'Other' },
    2: { '1': 'विद्यार्थी', '2': 'बेरोजगार', '3': 'नोकरी करता', '4': 'इतर' },
    4: { '1': 'होय', '2': 'नाही' },
    5: { '1': 'होय', '2': 'नाही' },
    7: { '1': 'होय', '2': 'नाही' }
  }
};

const mapAnswer = (lang, qIndex, rawInput) => {
  const mapping = OPTION_MAPPINGS[lang]?.[qIndex];
  return mapping?.[rawInput] || rawInput; // If not mapped, return as-is
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

 if (res.length === 0) return q[0];
if (res.length === 1) return q[1];
if (res.length === 2) return q[2];

let occupation = res[2]?.toLowerCase();

// Convert numeric input to occupation string (Hindi/Marathi safe)
if (occupation === '1') occupation = 'student';
else if (occupation === '2') occupation = 'unemployed';
else if (occupation === '3') occupation = 'employed';
else if (occupation === '4') occupation = 'other';

if (
  (occupation === 'student' || occupation === 'unemployed' || occupation === 'विद्यार्थी' || occupation === 'बेरोज़गार') &&
  res.length === 3
) {
  return q[3]; // Ask: Do you have a bank account?
}

if (res.length === 3 && (occupation === 'employed' || occupation === 'नौकरीपेशा')) {
  return q[4]; // Ask: Income
}

if (
  res.length === 4 &&
  (occupation === 'student' || occupation === 'unemployed' || occupation === 'विद्यार्थी' || occupation === 'बेरोज़गार')
) {
  return q[4]; // Now ask income
}

if (res.length === 5) return q[5];
if (res.length === 6) return q[6];
if (res.length === 7) return q[7];

return null;
};

app.post('/gupshup', async (req, res) => {
  const data = req.body?.payload;
  const phone = data?.sender?.phone;
  const msg = data?.payload?.text?.toLowerCase().trim();

  if (!userContext[phone]) {
    if (msg.includes('1')) userContext[phone] = { language: '1', responses: [] };
    else if (msg.includes('2')) userContext[phone] = { language: '2', responses: [] };
    else if (msg.includes('3')) userContext[phone] = { language: '3', responses: [] };
    else {
      await sendMessage(phone, "Namaste! Main hoon ApnaScheme – aapka digital dost 🇮🇳\nMain aapko batata hoon kaunsi Sarkari Yojana aapke liye hai – bina agent, bina form, bina confusion.\n\n🗣️ Apni bhaasha chunein (1, 2, 3):\n1. हिंदी\n2. English\n3. मराठी");
      return res.sendStatus(200);
    }

    const firstQuestion = getNextQuestion(userContext[phone]);
    await sendMessage(phone, firstQuestion);
    return res.sendStatus(200);
  }

  const user = userContext[phone];
  const qIndex = user.responses.length;
  const mapped = mapAnswer(parseInt(user.language), qIndex, msg);
  user.responses.push(mapped);

  const next = getNextQuestion(user);
  if (next) {
    await sendMessage(phone, next);
  } else {
    let closingMessage = "";

    if (user.language === '1') {
      closingMessage = 'धन्यवाद!\n\nआप सरकारी योजना के लिए पात्र हैं!\n\nयोजनाओं के नाम, अप्लाई करने का लिंक और पूरी जानकारी चाहिए?\nयह पूरी मदद सिर्फ ₹49 में मिलेगी।\n\nPay karo yahaan: https://rzp.io/rzp/razorpay49\n\nआपका भुगतान सुरक्षित है।\nपूरा scheme list तुरंत WhatsApp पर भेजा जाएगा।';
    } else if (user.language === '2') {
      closingMessage = `Thank you!\n\nYou are eligible for government schemes!\n\nWant full details? (Scheme names, application link)\nYou’ll get everything for just ₹49.\n\nMake Payment here: https://rzp.io/rzp/razorpay49\n\nSecure payment.\nFull scheme list will be sent instantly via WhatsApp.`;
    } else if (user.language === '3') {
      closingMessage = `आभार!\n\nतुम्ही सरकारी योजनांसाठी पात्र आहात!\n\nसंपूर्ण माहिती हवी आहे? (योजना नावे, अर्ज लिंक्स)\nसर्व माहिती फक्त ₹49 मध्ये मिळेल.\n\nपैसे भरा इथे: https://rzp.io/rzp/razorpay49\n\nतुमचं पेमेंट सुरक्षित आहे.\nसर्व योजना WhatsApp वर लगेच पाठवल्या जातील.`;
    }

    await sendMessage(phone, closingMessage);
    delete userContext[phone]; // Reset after flow
  }

  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.send('✅ ApnaScheme Bot is running with mapped responses and 3-language flow.');
});

app.listen(PORT, () => {
  console.log(`🚀 Server live on port ${PORT}`);
});

