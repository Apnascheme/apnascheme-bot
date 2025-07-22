import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';
import admin from 'firebase-admin';
import serviceAccount from './firebase-service-account.json'; // replace with your actual path

dotenv.config();

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

// In-memory state: Replace with DB for production!
const userStates = {};

const LANGUAGES = [
  { code: "hi", label: "हिंदी" },
  { code: "en", label: "English" },
  { code: "mr", label: "मराठी" }
];

const GENDER_OPTIONS = [
  { label: "👨‍🦰 Purush", value: "Purush" },
  { label: "👩 Mahila", value: "Mahila" },
  { label: "🧕 Vidhwa", value: "Vidhwa" },
  { label: "♿ Viklang", value: "Viklang" }
];

const CATEGORY_OPTIONS = [
  { label: "Haan", value: "Yes" },
  { label: "Nahi", value: "No" }
];

const OCCUPATION_OPTIONS = [
  { label: "Student", value: "Student" },
  { label: "Unemployed", value: "Unemployed" },
  { label: "Employed", value: "Employed" },
  { label: "Self-employed", value: "Self-employed" },
  { label: "Farmer", value: "Farmer" },
  { label: "Labourer", value: "Labourer" },
  { label: "Other", value: "Other" }
];

const YESNO_OPTIONS = [
  { label: "Yes", value: "Yes" },
  { label: "No", value: "No" }
];

const STATES = [
  "Maharashtra", "Chhattisgarh", "Uttar Pradesh", "Madhya Pradesh", "Gujarat", "Bihar", "Other"
];

const paymentLink = "https://rzp.io/rzp/razorpay49";
const referralNumber = "917977594397";

function quickReplies(text, options) {
  return {
    type: "quick_reply",
    content: {
      type: "text",
      text,
      options: options.map(opt => ({
        type: "text",
        title: opt.label,
        postbackText: opt.value
      }))
    }
  };
}

function sendGupshupMessage(destination, message) {
  const params = {
    channel: 'whatsapp',
    source: process.env.GUPSHUP_PHONE_NUMBER,
    destination,
    'src.name': 'ApnaSchemeTechnologies',
    message: JSON.stringify(message)
  };
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    apikey: process.env.GUPSHUP_APP_TOKEN
  };
  return axios.post('https://api.gupshup.io/sm/api/v1/msg', new URLSearchParams(params).toString(), { headers });
}

function resetUser(phone) {
  userStates[phone] = {
    step: "language",
    answers: {}
  };
}

app.post('/gupshup', async (req, res) => {
  const payload = req.body.payload;
  if (!payload || !payload.sender || !payload.payload) return res.sendStatus(400);

  const phone = payload.sender.phone;
  const text = payload.payload.text?.trim();
  if (!text) return res.sendStatus(200);

  if (text.toLowerCase() === 'hi') {
    resetUser(phone);
    await sendGupshupMessage(phone, quickReplies(
      `🗣️ Apni bhaasha chunein:\n🔘 हिंदी\n🔘 English\n🔘 मराठी`, LANGUAGES
    ));
    return res.sendStatus(200);
  }

  if (!userStates[phone]) {
    await sendGupshupMessage(phone, { type: "text", text: "Namaste! Kripya 'hi' likhkar shuru karein." });
    return res.sendStatus(200);
  }

  const state = userStates[phone];
  const ans = state.answers;

  if (state.step === "language") {
    const lang = LANGUAGES.find(l => l.code === text.toLowerCase() || l.label === text);
    if (!lang) {
      await sendGupshupMessage(phone, quickReplies(
        `🗣️ Apni bhaasha chunein:\n🔘 हिंदी\n🔘 English\n🔘 मराठी`, LANGUAGES
      ));
      return res.sendStatus(200);
    }
    ans.language = lang.code;
    state.step = "Q1";
    await sendGupshupMessage(phone, quickReplies("Aapka gender kya hai?", GENDER_OPTIONS));
    return res.sendStatus(200);
  }

  if (state.step === "Q1") {
    const gender = GENDER_OPTIONS.find(g => g.value.toLowerCase() === text.toLowerCase() || g.label === text);
    if (!gender) {
      await sendGupshupMessage(phone, quickReplies("Aapka gender kya hai?", GENDER_OPTIONS));
      return res.sendStatus(200);
    }
    ans.gender = gender.value;
    state.step = "Q2";
    await sendGupshupMessage(phone, { type: "text", text: "Aapki age kitni hai? (Numeric, e.g. 24)" });
    return res.sendStatus(200);
  }

  if (state.step === "Q2") {
    const age = parseInt(text);
    if (isNaN(age) || age < 1 || age > 120) {
      await sendGupshupMessage(phone, { type: "text", text: "Kripya sahi age daalein (e.g. 24)" });
      return res.sendStatus(200);
    }
    ans.age = age;
    state.step = "Q3";
    await sendGupshupMessage(phone, { type: "text", text: "Aapka rajya kaunsa hai? (e.g. Maharashtra)" });
    return res.sendStatus(200);
  }

  if (state.step === "Q3") {
    if (!STATES.map(s => s.toLowerCase()).includes(text.toLowerCase()) && text.length < 3) {
      await sendGupshupMessage(phone, { type: "text", text: "Kripya rajya ka poora naam daalein (e.g. Maharashtra)" });
      return res.sendStatus(200);
    }
    ans.state = text;
    state.step = "Q4";
    await sendGupshupMessage(phone, quickReplies("Aap SC/ST/OBC/EWS category mein aate ho kya?", CATEGORY_OPTIONS));
    return res.sendStatus(200);
  }

  if (state.step === "Q4") {
    if (!["haan", "yes", "nahi", "no"].includes(text.toLowerCase())) {
      await sendGupshupMessage(phone, quickReplies("Aap SC/ST/OBC/EWS category mein aate ho kya?", CATEGORY_OPTIONS));
      return res.sendStatus(200);
    }
    ans.category = ["haan", "yes"].includes(text.toLowerCase()) ? "Yes" : "No";
    state.step = "Q5";
    await sendGupshupMessage(phone, quickReplies("Aapka current occupation kya hai?", OCCUPATION_OPTIONS));
    return res.sendStatus(200);
  }

  if (state.step === "Q5") {
    const occ = OCCUPATION_OPTIONS.find(o => o.value.toLowerCase() === text.toLowerCase() || o.label === text);
    if (!occ) {
      await sendGupshupMessage(phone, quickReplies("Aapka current occupation kya hai?", OCCUPATION_OPTIONS));
      return res.sendStatus(200);
    }
    ans.occupation = occ.value;
    if (["Student", "Unemployed"].includes(occ.value)) {
      state.step = "Q6_guardian";
      await sendGupshupMessage(phone, { type: "text", text: "Aapke guardian ka saalana aay kya hai? (₹ mein, e.g. 100000)" });
    } else {
      state.step = "Q6";
      await sendGupshupMessage(phone, { type: "text", text: "Aapka saalana aay kya hai? (₹ mein, e.g. 150000)" });
    }
    return res.sendStatus(200);
  }

  if (state.step === "Q6") {
    const income = parseInt(text.replace(/[^0-9]/g, ''));
    if (isNaN(income) || income < 0) {
      await sendGupshupMessage(phone, { type: "text", text: "Kripya sahi amount daalein (₹ mein, e.g. 150000)" });
      return res.sendStatus(200);
    }
    ans.income = income;
    state.step = ans.age < 18 ? "Q8" : "Q7";
    const next = ans.age < 18 ? "Kya aapke paas ration card hai?" : "Aapka bank account khula hai kya?";
    await sendGupshupMessage(phone, quickReplies(next, YESNO_OPTIONS));
    return res.sendStatus(200);
  }

  if (state.step === "Q6_guardian") {
    const income = parseInt(text.replace(/[^0-9]/g, ''));
    if (isNaN(income) || income < 0) {
      await sendGupshupMessage(phone, { type: "text", text: "Kripya sahi amount daalein (₹ mein, e.g. 120000)" });
      return res.sendStatus(200);
    }
    ans.guardian_income = income;
    state.step = ans.age < 18 ? "Q8" : "Q7";
    const next = ans.age < 18 ? "Kya aapke paas ration card hai?" : "Aapka bank account khula hai kya?";
    await sendGupshupMessage(phone, quickReplies(next, YESNO_OPTIONS));
    return res.sendStatus(200);
  }

  if (state.step === "Q7") {
    if (!["yes", "no"].includes(text.toLowerCase())) {
      await sendGupshupMessage(phone, quickReplies("Aapka bank account khula hai kya?", YESNO_OPTIONS));
      return res.sendStatus(200);
    }
    ans.bank_account = text.toLowerCase() === "yes" ? "Yes" : "No";
    state.step = "Q8";
    await sendGupshupMessage(phone, quickReplies("Kya aapke paas ration card hai?", YESNO_OPTIONS));
    return res.sendStatus(200);
  }

  if (state.step === "Q8") {
    if (!["yes", "no"].includes(text.toLowerCase())) {
      await sendGupshupMessage(phone, quickReplies("Kya aapke paas ration card hai?", YESNO_OPTIONS));
      return res.sendStatus(200);
    }
    ans.ration_card = text.toLowerCase() === "yes" ? "Yes" : "No";
    state.step = "Q9";
    await sendGupshupMessage(phone, quickReplies("Kya aap kisi existing Sarkari Yojana ka labh le rahe ho?", YESNO_OPTIONS));
    return res.sendStatus(200);
  }

  if (state.step === "Q9") {
    if (!["yes", "no"].includes(text.toLowerCase())) {
      await sendGupshupMessage(phone, quickReplies("Kya aap kisi existing Sarkari Yojana ka labh le rahe ho?", YESNO_OPTIONS));
      return res.sendStatus(200);
    }
    ans.existing_scheme = text.toLowerCase() === "yes" ? "Yes" : "No";
    state.step = "eligible";
    state.eligibleSchemes = [
      "2 Mahila Yojana",
      "1 Student Yojana",
      "1 Health Yojana"
    ];
    const eligibleMsg = `Aapke diye gaye jawaabon ke hisaab se:\n\n🎯 Aap **4 Sarkari Yojana** ke liye eligible ho sakte ho:\n- 2 Mahila Yojana\n- 1 Student Yojana\n- 1 Health Yojana\n\n✅ In Yojanon ke naam, full details aur ek simple PDF chahiye?\nYeh poori madad sirf ₹49 mein milegi.`;
    await sendGupshupMessage(phone, { type: "text", text: eligibleMsg });
    await sendGupshupMessage(phone, { type: "text", text: "Please note: ₹49 is a one-time charge for full scheme list + PDF + guidance.\n\nThis amount is **non-refundable** once paid." });
    await sendGupshupMessage(phone, {
      type: "text",
      text: `🔒 Apna ₹49 Yojana Assist plan activate karne ke liye yahaan bharein:\n\n${paymentLink}\n\nAapka payment secure hai. Poora scheme list turant WhatsApp par bheja jayega.`
    });
    state.step = "await_payment";
    return res.sendStatus(200);
  }

  await sendGupshupMessage(phone, { type: "text", text: "Kripya 'hi' likhkar shuru karein ya apna prashn poochein." });
  return res.sendStatus(200);
});

// ✅ Razorpay Webhook to confirm real payments and send schemes
app.post('/razorpay-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body;

    const expectedSignature = crypto.createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) return res.status(400).send('Invalid signature');

    const event = JSON.parse(body);
    if (event.event === 'payment.captured') {
      const phone = event.payload.payment.entity.notes?.phone;
      if (phone && userStates[phone]) {
        const state = userStates[phone];
        await sendGupshupMessage(phone, {
          type: "text",
          text: `✅ Payment received!\n\n🎉 Mubarak ho! Aapke liye yeh 4 Yojana mil rahi hai:\n\n- ${state.eligibleSchemes.join("\n- ")}\n\nAgar aapko apply karne mein koi bhi madad chahiye, yahi WhatsApp par poochh sakte ho.`
        });
        await sendGupshupMessage(phone, {
          type: "text",
          text: `Apne doston ko bhi madad do – Apna referral link unko bhejein:\n👉 wa.me/${referralNumber}?text=Hi`
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

app.listen(PORT, async () => {
  console.log(`ApnaScheme bot server started on port ${PORT}`);
  
  // 🔥 Test Firestore write
  try {
    await db.collection('test').doc('sample').set({
      hello: 'world',
      timestamp: Date.now()
    });
    console.log('✅ Test Firestore write successful');
  } catch (err) {
    console.error('❌ Firestore write failed:', err);
  }
});
