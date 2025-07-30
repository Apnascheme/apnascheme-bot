import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import ExcelJS from 'exceljs';
import crypto from 'crypto'; 
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BASE_URL = 'https://api.gupshup.io/sm/api/v1/msg';
const GUPSHUP_APP_TOKEN = process.env.GUPSHUP_APP_TOKEN;
const GUPSHUP_PHONE_NUMBER = process.env.GUPSHUP_PHONE_NUMBER;

const userContext = {}; // Stores user responses
let schemes = []; // Loaded schemes from Excel

// Question sets for 3 languages
const QUESTIONS = {
  1: [
    "आपका लिंग क्या है?\n1. पुरुष\n2. महिला\n3. अन्य",
    "आपकी उम्र कितनी है? (केवल संख्या में लिखें, जैसे: 18)",
    "आप क्या करते हैं?\n1. छात्र\n2. बेरोज़गार\n3. नौकरीपेशा\n4.दिव्यांग",
    "आपके परिवार की सालाना आय कितनी है? (केवल संख्या में लिखें, जैसे: 120000)",
    "क्या आपका बैंक खाता है?\n1. हाँ\n2. नहीं",
    "क्या आपके पास राशन कार्ड है?\n1. हाँ\n2. नहीं",
    "आपका राज्य कौन सा है? (उदाहरण: महाराष्ट्र)",
    "क्या आप SC/ST/OBC/EWS श्रेणी में आते हैं?\n1. हाँ\n2. नहीं"
  ],
  2: [
    "What is your gender?\n1. Male\n2. Female\n3. Other",
    "What is your age?\n (Enter number eg. 18)",
    "What do you do?\n1. Student\n2. Unemployed\n3. Employed\n4. Disabled",
    "What is your Household yearly income?\n (eg. 120000)",
    "Do you have a bank account?\n1. Yes\n2. No",
    "Do you have a ration card?\n1. Yes\n2. No",
    "Which state do you live in?\n (eg. Maharashtra)",
    "Do you belong to SC/ST/OBC/EWS category?\n1. Yes\n2. No"
  ],
  3: [
    "तुमचं लिंग काय आहे?\n1.पुरुष\n2.महिला\n3.इतर",
    "तुमचं वय किती आहे? (उदाहरण: 18)",
    "तुम्ही काय करता?\n1. विद्यार्थी\n2. बेरोजगार\n3. नोकरी करता\n4. दिव्यांग",
    "तुमच्या कुटुंबाचे वार्षिक उत्पन्न किती आहे? (फक्त संख्या लिहा, उदा: 120000)",
    "तुमचं बँक खाते आहे का?\n1. होय\n2. नाही",
    "तुमच्याकडे रेशन कार्ड आहे का?\n1. होय\n2. नाही",
    "तुमचं राज्य कोणतं? (उदा: महाराष्ट्र)",
    "तुम्ही SC/ST/OBC/EWS प्रवर्गात मोडता का?\n1. होय\n2. नाही"
  ]
};

// Answer mappings for each language
const OPTION_MAPPINGS = {
  1: {
    0: { '1': 'पुरुष', '2': 'महिला', '3': 'अन्य' },
    2: { '1': 'छात्र', '2': 'बेरोज़गार', '3': 'नौकरीपेशा', '4': 'दिव्यांग' },
    4: { '1': 'हाँ', '2': 'नहीं' },
    5: { '1': 'हाँ', '2': 'नहीं' },
    7: { '1': 'हाँ', '2': 'नहीं' }
  },
  2: {
    0: { '1': 'Male', '2': 'Female', '3': 'Other' },
    2: { '1': 'Student', '2': 'Unemployed', '3': 'Employed', '4': 'Disabled' },
    4: { '1': 'Yes', '2': 'No' },
    5: { '1': 'Yes', '2': 'No' },
    7: { '1': 'Yes', '2': 'No' }
  },
  3: {
    0: { '1': 'पुरुष', '2': 'महिला', '3': 'इतर' },
    2: { '1': 'विद्यार्थी', '2': 'बेरोजगार', '3': 'नोकरी करता', '4': 'दिव्यांग' },
    4: { '1': 'होय', '2': 'नाही' },
    5: { '1': 'होय', '2': 'नाही' },
    7: { '1': 'होय', '2': 'नाही' }
  }
};

// Load schemes from Excel
async function loadSchemes() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('ApnaScheme_Phase1_50_Scheme_Template.xlsx');
  const worksheet = workbook.getWorksheet(1);
  
  schemes = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    schemes.push({
      SchemeName: row.getCell(1).value,
      Category: row.getCell(2).value,
      TargetState: row.getCell(3).value,
      MinAge: row.getCell(4).value,
      MaxAge: row.getCell(5).value,
      IncomeLimit: row.getCell(6).value,
      CasteEligibility: row.getCell(7).value,
      EmploymentFilter: row.getCell(8).value,
      BankAccountRequired: row.getCell(9).value === 'Yes',
      AadhaarRequired: row.getCell(10).value === 'Yes',
      ApplicationMode: row.getCell(11).value,
      OfficialLink: row.getCell(12).value,
      ActiveStatus: row.getCell(13).value
    });
  });
}

// Filter eligible schemes
function getEligibleSchemes(userResponses) {
  const [gender, age, occupation, income, hasBank, hasRation, state, caste] = userResponses;

  return schemes.filter(scheme => {
    if (scheme.ActiveStatus !== 'Active') return false;

    const schemeNameLower = scheme.SchemeName?.toLowerCase() || '';
    const genderLower = gender?.toLowerCase() || '';
    const occupationLower = occupation?.toLowerCase() || '';
    const userState = state?.toLowerCase()?.trim() || '';
    const schemeState = scheme.TargetState?.toLowerCase()?.trim() || '';

    // Gender-specific schemes
    const womenSchemes = ['matru', 'ujjwala', 'sukanya', 'ladli', 'bhagyashree', 'janani', 'beti'];
    if (womenSchemes.some(word => schemeNameLower.includes(word)) {
      if (!['female', 'महिला', 'स्त्री', 'woman', 'girl'].includes(genderLower)) return false;
    }

    // Disability schemes
    const disabilitySchemes = ['disability', 'divyang', 'viklang', 'udid', 'adip'];
    if (disabilitySchemes.some(word => schemeNameLower.includes(word))) {
      if (!occupationLower.includes('disabled')) return false;
    }

    // State filter
    if (schemeState !== 'all india' && schemeState !== userState) return false;

    // Age filter
    const minAge = scheme.MinAge || 0;
    const maxAge = scheme.MaxAge || 100;
    if (age < minAge || age > maxAge) return false;

    // Income filter
    if (scheme.IncomeLimit && income > scheme.IncomeLimit) return false;

    // Caste filter
    if (scheme.CasteEligibility && scheme.CasteEligibility !== 'All') {
      const schemeCastes = scheme.CasteEligibility.split('/').map(c => c.trim().toLowerCase());
      const userCaste = caste?.toLowerCase()?.trim() || '';
      if (!schemeCastes.includes(userCaste)) {
        if (userCaste === 'general' && !schemeCastes.includes('general')) return false;
        if (userCaste === 'no' && !schemeCastes.includes('general')) return false;
      }
    }

    // Bank account required
    if (scheme.BankAccountRequired) {
      const hasBankLower = hasBank?.toLowerCase();
      if (!['हाँ', 'yes', 'होय', 'y', 'haan', 'हां'].includes(hasBankLower)) return false;
    }

    // Aadhaar required
    if (scheme.AadhaarRequired) {
      const hasRationLower = hasRation?.toLowerCase();
      if (!['हाँ', 'yes', 'होय', 'y', 'haan', 'हां'].includes(hasRationLower)) return false;
    }

    return true;
  });
}

// Map answers to human-readable format
const mapAnswer = (lang, qIndex, rawInput) => {
  const mapping = OPTION_MAPPINGS[lang]?.[qIndex];
  return mapping?.[rawInput] || rawInput;
};

// Send WhatsApp message via Gupshup
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

// Determine next question based on current responses
const getNextQuestion = (user) => {
  const lang = user.language;
  const q = QUESTIONS[lang];
  const res = user.responses;

  if (res.length === 0) return q[0]; // Gender
  if (res.length === 1) return q[1]; // Age
  if (res.length === 2) return q[2]; // Occupation
  if (res.length === 3) return q[3]; // Income
  if (res.length === 4) return q[4]; // Bank account
  if (res.length === 5) return q[5]; // Ration card
  if (res.length === 6) return q[6]; // State
  if (res.length === 7) return q[7]; // Caste
  return null; // Done
};

// WhatsApp message handler
app.post('/gupshup', async (req, res) => {
  const data = req.body?.payload;
  const phone = data?.sender?.phone;
  const msg = data?.payload?.text?.toLowerCase().trim();

  if (!userContext[phone]) {
    // Language selection
    if (msg.includes('1')) userContext[phone] = { language: '1', responses: [] };
    else if (msg.includes('2')) userContext[phone] = { language: '2', responses: [] };
    else if (msg.includes('3')) userContext[phone] = { language: '3', responses: [] };
    else {
      await sendMessage(phone, 
        "Namaste! Main hoon ApnaScheme – aapka digital dost 🇮🇳\n" +
        "Main aapko batata hoon kaunsi Sarkari Yojana aapke liye hai.\n\n" +
        "🗣️ Apni bhaasha chunein:\n1. हिंदी\n2. English\n3. मराठी"
      );
      return res.sendStatus(200);
    }

    const firstQuestion = getNextQuestion(userContext[phone]);
    await sendMessage(phone, firstQuestion);
    return res.sendStatus(200);
  }

  // Process user response
  const user = userContext[phone];
  const qIndex = user.responses.length;
  const mapped = mapAnswer(parseInt(user.language), qIndex, msg);
  user.responses.push(mapped);

  const next = getNextQuestion(user);
  if (next) {
    await sendMessage(phone, next);
  } else {
    // Generate payment link with phone number in metadata
    const paymentLink = `https://rzp.io/rzp/razorpay49?notes[phone]=${encodeURIComponent(phone)}`;
    
    let closingMessage;
    if (user.language === '1') { // Hindi
      closingMessage = `ज़बरदस्त खबर! आप ${eligibleSchemes.length} योजनाओं के लिए पात्र हैं!\n\n` +
        `सिर्फ ₹49 में पाएं:\n✔ पूरी योजना सूची\n✔ आवेदन लिंक\n\n` +
        `अभी पेमेंट करें:\n${paymentLink}\n\n` +
        `ऑफर सीमित समय के लिए!`;
    } 
    else if (user.language === '3') { // Marathi
      closingMessage = `जबरदस्त बातम्या! तुम्ही ${eligibleSchemes.length} योजनांसाठी पात्र आहात!\n\n` +
        `फक्त ₹49 मध्ये मिळवा:\n✔ संपूर्ण योजना यादी\n✔ अर्ज लिंक\n\n` +
        `आत्ताच पेमेंट करा:\n${paymentLink}\n\n` +
        `मर्यादित वेळ ऑफर!`;
    } 
    else { // English (default)
      closingMessage = `Amazing News! You're eligible for ${eligibleSchemes.length} schemes!\n\n` +
        `For just ₹49 get:\n✔ Full scheme list\n✔ Application links\n\n` +
        `Make payment now:\n${paymentLink}\n\n` +
        `Limited time offer!`;
    }

    await sendMessage(phone, closingMessage);
  }
  res.sendStatus(200);
});

// Razorpay payment webhook
app.post('/payment-webhook', async (req, res) => {
  try {
    const rawBody = req.body;
    const bodyString = JSON.stringify(rawBody);
    const razorpaySignature = req.headers['x-razorpay-signature'];

    // Verify signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyString)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      console.error('❌ Invalid signature');
      return res.status(401).send('Invalid signature');
    }

    const payment = rawBody.payload?.payment?.entity;
    if (!payment || payment.status !== 'captured') {
      return res.status(400).send('Payment not captured');
    }

    // Get phone from payment notes
    const userPhone = payment.notes?.phone;
    if (!userPhone) {
      console.error('No phone number in payment notes');
      return res.status(400).send('Phone number missing');
    }

    // Get user context
    const user = userContext[userPhone];
    if (!user) {
      console.error('User session expired for:', userPhone);
      return res.status(400).send('User session expired');
    }

    // Get eligible schemes
    const eligibleSchemes = getEligibleSchemes(user.responses);
    
    // Format response message
    let message;
    if (user.language === '1') { // Hindi
      message = `✅ भुगतान सफल!\n\nआपकी योजनाएं (${eligibleSchemes.length}):\n\n`;
      eligibleSchemes.forEach(scheme => {
        message += `📌 ${scheme.SchemeName}\n🔗 ${scheme.OfficialLink || 'लिंक उपलब्ध नहीं'}\n\n`;
      });
      message += `📄 रसीद ID: ${payment.id}`;
    } 
    else if (user.language === '3') { // Marathi
      message = `✅ पेमेंट यशस्वी!\n\nतुमच्या योजना (${eligibleSchemes.length}):\n\n`;
      eligibleSchemes.forEach(scheme => {
        message += `📌 ${scheme.SchemeName}\n🔗 ${scheme.OfficialLink || 'लिंक उपलब्ध नाही'}\n\n`;
      });
      message += `📄 पावती ID: ${payment.id}`;
    } 
    else { // English
      message = `✅ Payment Successful!\n\nYour Schemes (${eligibleSchemes.length}):\n\n`;
      eligibleSchemes.forEach(scheme => {
        message += `📌 ${scheme.SchemeName}\n🔗 ${scheme.OfficialLink || 'Link not available'}\n\n`;
      });
      message += `📄 Receipt ID: ${payment.id}`;
    }

    // Send WhatsApp message
    await sendMessage(userPhone, message);
    console.log(`📩 Sent schemes to ${userPhone}`);
    
    // Cleanup
    delete userContext[userPhone];
    res.status(200).send('Success');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Server error');
  }
});

// Start server
app.listen(PORT, async () => {
  try {
    await loadSchemes();
    console.log(`🚀 Server running on port ${PORT} | ${schemes.length} schemes loaded`);
  } catch (err) {
    console.error('Failed to load schemes:', err);
    process.exit(1);
  }
});
