import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import ExcelJS from 'exceljs';
import crypto from 'crypto';
import Razorpay from 'razorpay';
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BASE_URL = 'https://api.gupshup.io/sm/api/v1/msg';
const GUPSHUP_APP_TOKEN = process.env.GUPSHUP_APP_TOKEN;
const GUPSHUP_PHONE_NUMBER = process.env.GUPSHUP_PHONE_NUMBER;

// Initialize Razorpay client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const userContext = {}; // Temporary in-memory store
let schemes = []; // Store loaded schemes

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

// ... [Keep all your existing OPTION_MAPPINGS, loadSchemes(), getEligibleSchemes(), mapAnswer(), sendMessage(), and getNextQuestion() functions unchanged] ...

app.post('/gupshup', async (req, res) => {
  const data = req.body?.payload;
  const phone = data?.sender?.phone;
  const msg = data?.payload?.text?.toLowerCase().trim();

  if (!userContext[phone]) {
    if (msg.includes('1')) userContext[phone] = { language: '1', responses: [] };
    else if (msg.includes('2')) userContext[phone] = { language: '2', responses: [] };
    else if (msg.includes('3')) userContext[phone] = { language: '3', responses: [] };
    else {
      await sendMessage(phone, "Namaste! Main hoon ApnaScheme – aapka digital dost 🇮🇳\nMain aapko batata hoon kaunsi Sarkari Yojana aapke liye hai – bina agent, bina form, bina confusion.\n\n🗣️ Apni bhaasha chunein\n(Please select 1, 2, 3 to answer):\n1. हिंदी\n2. English\n3. मराठी");
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
    const eligibleSchemes = getEligibleSchemes(user.responses);
    
    let closingMessage = "";
    if (user.language === '1') {
        closingMessage = ` ज़बरदस्त खबर! \nआप ${eligibleSchemes.length} सरकारी योजनाओं के लिए पात्र हैं!\n\n`
                      + ` सिर्फ ₹49 में पाएं:\n`
                      + `  आपके लिए सभी योजनाओं की पूरी लिस्ट\n`
                      + ` सीधे आवेदन करने के लिंक\n\n`
                      + ` अभी पेमेंट करें: \nhttps://rzp.io/l/apnascheme?notes[phone]=${encodeURIComponent(phone)}\n\n`
                      + ` ऑफर सीमित समय के लिए!`;
    } else if (user.language === '2') {
        closingMessage = ` Amazing News! \nYou're eligible for ${eligibleSchemes.length} government schemes!\n\n`
                      + ` For just ₹49 get:\n`
                      + ` Complete list of all schemes for you\n`
                      + ` Direct application links\n\n`
                      + ` Make payment now: \nhttps://rzp.io/l/apnascheme?notes[phone]=${encodeURIComponent(phone)}\n\n`
                      + `Limited time offer!`;
    } else if (user.language === '3') {
        closingMessage = ` जबरदस्त बातम्या! \nतुम्ही ${eligibleSchemes.length} सरकारी योजनांसाठी पात्र आहात!\n\n`
                      + ` फक्त ₹49 मध्ये मिळवा:\n`
                      + ` तुमच्यासाठी सर्व योजनांची संपूर्ण यादी\n`
                      + ` थेट अर्ज करण्याचे लिंक\n\n`
                      + ` आत्ताच पेमेंट करा: \nhttps://rzp.io/l/apnascheme?notes[phone]=${encodeURIComponent(phone)}\n\n`
                      + ` मर्यादित वेळ ऑफर!`;
    }

    await sendMessage(phone, closingMessage);
  }
  res.sendStatus(200);
});

// Razorpay Webhook Handler
app.use('/razorpay-webhook', express.raw({ type: 'application/json' }));

app.post('/razorpay-webhook', async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body.toString();

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('⚠️ Invalid Razorpay signature');
      return res.status(401).send('Unauthorized');
    }

    const payload = JSON.parse(body);
    const payment = payload?.payload?.payment?.entity;

    if (!payment || payment.status !== 'captured') {
      return res.status(400).send('Not a captured payment');
    }

    // Extract phone number from notes
    const userPhone = payment.notes?.phone;
    if (!userPhone || !userContext[userPhone]) {
      console.warn('User context not found for phone:', userPhone);
      return res.status(404).send('User not found');
    }

    const user = userContext[userPhone];
    const eligibleSchemes = getEligibleSchemes(user.responses);
    const lang = user.language || '2'; // Default to English

    let message;
    if (lang === '1') { // Hindi
      message = `✅ भुगतान सफल!\n\nआपकी योजनाएं (${eligibleSchemes.length}):\n\n`;
      eligibleSchemes.forEach(scheme => {
        message += `• ${scheme.SchemeName}\n🔗 आवेदन: ${scheme.OfficialLink}\n📝 तरीका: ${scheme.ApplicationMode}\n\n`;
      });
      message += `📄 रसीद ID: ${payment.id}`;
    } 
    else if (lang === '3') { // Marathi
      message = `✅ पेमेंट यशस्वी!\n\nतुमच्या योजना (${eligibleSchemes.length}):\n\n`;
      eligibleSchemes.forEach(scheme => {
        message += `• ${scheme.SchemeName}\n🔗 अर्ज: ${scheme.OfficialLink}\n📝 पद्धत: ${scheme.ApplicationMode}\n\n`;
      });
      message += `📄 पावती ID: ${payment.id}`;
    } 
    else { // English (default)
      message = `✅ Payment Successful!\n\nYour Schemes (${eligibleSchemes.length}):\n\n`;
      eligibleSchemes.forEach(scheme => {
        message += `• ${scheme.SchemeName}\n🔗 Apply: ${scheme.OfficialLink}\n📝 Mode: ${scheme.ApplicationMode}\n\n`;
      });
      message += `📄 Receipt ID: ${payment.id}`;
    }

    await sendMessage(userPhone, message);
    console.log(`📩 Sent schemes to ${userPhone}`);
    
    delete userContext[userPhone]; // Cleanup
    res.status(200).send('Success');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Server error');
  }
});

// Test endpoint to verify Razorpay integration
app.get('/test-razorpay', async (req, res) => {
  try {
    const testPhone = '9321875559'; // Test phone number
    const options = {
      amount: 4900, // ₹49 in paise
      currency: "INR",
      receipt: "order_test_001",
      notes: {
        phone: testPhone, // Including phone in notes
        purpose: "ApnaScheme test payment"
      },
    };

    const order = await razorpay.orders.create(options);
    res.json({
      success: true,
      orderId: order.id,
      message: `Test order created for ${testPhone}`,
      paymentLink: `https://rzp.io/l/apnascheme?notes[phone]=${encodeURIComponent(testPhone)}`
    });
  } catch (error) {
    console.error('Razorpay test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.send('✅ ApnaScheme Bot is running with Razorpay integration');
});

app.listen(PORT, async () => {
  try {
    await loadSchemes();
    console.log(`🚀 Server live on port ${PORT} | ${schemes.length} schemes loaded`);
  } catch (err) {
    console.error('Failed to load schemes:', err);
    process.exit(1);
  }
});
