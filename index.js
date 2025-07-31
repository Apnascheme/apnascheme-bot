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

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const userContext = {};
let schemes = [];
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
function getEligibleSchemes(userResponses, hasCriticalIllness = false) {
  const [gender, age, occupation, income, hasBank, hasRation, state, caste] = userResponses;

  return schemes.filter(scheme => {
    if (scheme.ActiveStatus !== 'Active') return false;

    const schemeNameLower = scheme.SchemeName?.toLowerCase() || '';
    const genderLower = gender?.toLowerCase() || '';
    const occupationLower = occupation?.toLowerCase() || '';
    const userState = state?.toLowerCase()?.trim() || '';
    const schemeState = scheme.TargetState?.toLowerCase()?.trim() || '';
 const womenSchemes = ['matru', 'ujjwala', 'sukanya', 'ladli', 'bhagyashree', 'janani', 'beti'];
    if (
      womenSchemes.some(word => schemeNameLower.includes(word)) &&
      !['female', 'महिला', 'स्त्री', 'woman', 'girl'].includes(genderLower)
    ) {
      return false;
    }

    // 🚫 2. Disability-specific schemes
    const disabilitySchemes = ['disability', 'divyang', 'viklang', 'udid', 'adip'];
    if (
      disabilitySchemes.some(word => schemeNameLower.includes(word)) &&
      !occupationLower.includes('disabled')
    ) {
      return false;
    }

    // 🚫 3. Maternity / health schemes filtering
    const maternitySchemes = ['janani', 'matru', 'maternity'];
    if (
      maternitySchemes.some(word => schemeNameLower.includes(word)) &&
      (
        genderLower !== 'female' ||
        age < 13 || age > 50
      )
    ) {
      return false;
    }

    // 🚫 4. Rashtriya Arogya Nidhi check (only if critical illness)
    if (
      schemeNameLower.includes('rashtriya arogya nidhi') &&
      !hasCriticalIllness
    ) {
      return false;
    }

    // 🚫 5. Occupation-specific filtering
    if (scheme.EmploymentFilter && scheme.EmploymentFilter !== 'All') {
      const schemeOccupation = scheme.EmploymentFilter.toLowerCase();
      if (!occupationLower.includes(schemeOccupation)) {
        return false;
      }
    }

    // ✅ 6. State filtering
    if (schemeState !== 'all india' && schemeState !== userState) return false;

    // ✅ 7. Age range filtering
    const minAge = scheme.MinAge || 0;
    const maxAge = scheme.MaxAge || 100;
    if (age < minAge || age > maxAge) return false;

    // ✅ 8. Income check
    if (scheme.IncomeLimit && income > scheme.IncomeLimit) return false;

    // ✅ 9. Caste filtering
    if (scheme.CasteEligibility && scheme.CasteEligibility !== 'All') {
      const schemeCastes = scheme.CasteEligibility.split('/').map(c => c.trim().toLowerCase());
      const userCaste = caste?.toLowerCase()?.trim() || '';
      if (!schemeCastes.includes(userCaste)) {
        if (userCaste === 'general' && !schemeCastes.includes('general')) return false;
        if (userCaste === 'no' && !schemeCastes.includes('general')) return false;
      }
    }

    // ✅ 10. Bank account required
    if (scheme.BankAccountRequired) {
      const hasBankLower = hasBank?.toLowerCase();
      if (!['हाँ', 'yes', 'होय', 'y', 'haan', 'हां'].includes(hasBankLower)) return false;
    }

    // ✅ 11. Aadhaar / Ration required
    if (scheme.AadhaarRequired) {
      const hasRationLower = hasRation?.toLowerCase();
      if (!['हाँ', 'yes', 'होय', 'y', 'haan', 'हां'].includes(hasRationLower)) return false;
    }
    // Filter logic remains the same as before
    // ... (keep your existing filter logic here)

    return true;
  });
}

const mapAnswer = (lang, qIndex, rawInput) => {
  const mapping = OPTION_MAPPINGS[lang]?.[qIndex];
  return mapping?.[rawInput] || rawInput;
};


// ... (Keep all your existing QUESTION, OPTION_MAPPINGS, loadSchemes(), 
// getEligibleSchemes(), mapAnswer(), getNextQuestion() functions exactly as they are) ...

const sendMessage = async (phone, msg) => {
  try {
    const encodedMessage = encodeURIComponent(msg);
    const url = `${BASE_URL}?channel=whatsapp&source=${GUPSHUP_PHONE_NUMBER}&destination=${phone}&message=${encodedMessage}&src.name=ApnaSchemeTechnologies`;
    
  const response=await axios.post(url, null, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        apikey: GUPSHUP_APP_TOKEN
      }
    });
    return response data;
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error.response?.data || error.message);
  }
};
const getNextQuestion = (user) => {
 const lang = user.language;
  const q = QUESTIONS[lang];
  const res = user.responses;

  if (res.length === 0) return q[0]; // Gender
  if (res.length === 1) return q[1]; // Age
  if (res.length === 2) return q[2]; // Occupation

  let occupation = res[2]?.toLowerCase();

  // Convert option numbers to labels first
  if (lang === '1') { // Hindi
    if (occupation === '1') occupation = 'छात्र';
    else if (occupation === '2') occupation = 'बेरोज़गार';
    else if (occupation === '3') occupation = 'नौकरीपेशा';
    else if (occupation === '4') occupation = 'अन्य';
  } else if (lang === '2') { // English
    if (occupation === '1') occupation = 'student';
    else if (occupation === '2') occupation = 'unemployed';
    else if (occupation === '3') occupation = 'employed';
    else if (occupation === '4') occupation = 'other';
  } else if (lang === '3') { // Marathi
    if (occupation === '1') occupation = 'विद्यार्थी';
    else if (occupation === '2') occupation = 'बेरोजगार';
    else if (occupation === '3') occupation = 'नोकरी करता';
    else if (occupation === '4') occupation = 'इतर';
  }

  const isStudent = ['student', 'छात्र', 'विद्यार्थी'].includes(occupation);
  const isUnemployed = ['unemployed', 'बेरोज़गार', 'बेरोजगार'].includes(occupation);
  const isEmployed = ['employed', 'नौकरीपेशा', 'नोकरी करता'].includes(occupation);

  // Always ask income question (q[3]) regardless of occupation
  if (res.length === 3) return q[3]; // Income
  
  // Then proceed with bank account question
  if (res.length === 4) return q[4]; // Bank account
  
  // Then ration card
  if (res.length === 5) return q[5]; // Ration card
  
  // Then state
  if (res.length === 6) return q[6]; // State
  
  // Finally caste
  if (res.length === 7) return q[7]; // Caste
  
  return null; // Done
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
    
    // Use your existing payment page with phone prefill
    const paymentUrl = `https://rzp.io/rzp/apnascheme?prefill[contact]=${phone}&notes[phone]=${phone}`;
    
    let closingMessage = "";
    if (user.language === '1') {
      closingMessage = `आप ${eligibleSchemes.length} सरकारी योजनाओं के लिए पात्र हैं!\n\n`
                    + `सिर्फ ₹49 में पाएं:\n`
                    + `आपके लिए सभी योजनाओं की पूरी लिस्ट\n`
                    + `सीधे आवेदन करने के लिंक\n\n`
                    + `अभी पेमेंट करें: \n${paymentUrl}\n\n`
                    + `ऑफर सीमित समय के लिए!`;
    } else if (user.language === '2') {
      closingMessage = `You're eligible for ${eligibleSchemes.length} government schemes!\n\n`
                    + `For just ₹49 get:\n`
                    + `Complete list of all schemes\n`
                    + `Direct application links\n\n`
                    + `Make payment now: \n${paymentUrl}\n\n`
                    + `Limited time offer!`;
    } else if (user.language === '3') {
      closingMessage = `जबरदस्त बातम्या! \nतुम्ही ${eligibleSchemes.length} सरकारी योजनांसाठी पात्र आहात!\n\n`
                    + `फक्त ₹49 मध्ये मिळवा:\n`
                    + `तुमच्यासाठी सर्व योजनांची संपूर्ण यादी\n`
                    + `थेट अर्ज करण्याचे लिंक\n\n`
                    + `आत्ताच पेमेंट करा: \n${paymentUrl}\n\n`
                    + `मर्यादित वेळ ऑफर!`;
    }

    await sendMessage(phone, closingMessage);
  }
  res.sendStatus(200);
});

app.post('/create-razorpay-order', async (req, res) => {
  try {
    const { phone, amount } = req.body;
    
    // Validate input
    if (!phone || !amount) {
      return res.status(400).json({ error: 'Phone and amount are required' });
    }

    const options = {
      amount: amount * 100, // Convert rupees to paise
      currency: "INR",
      receipt: order_${Date.now()}_${phone},
      notes: { 
        phone,
        purpose: 'Scheme Eligibility Report' 
      },
      payment_capture: 1 // Auto-capture payments
    };
const order = await razorpay.orders.create(options);
    res.json({
      id: order.id,
      currency: order.currency,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY_ID // Send key for client-side integration
    });
  } catch (error) {
    console.error("Order creation failed:", error);
    res.status(500).json({ error: "Payment processing error" });
  }
});

app.post('/payment-success', async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, phone } = req.body;
    
    // Validate input
    if (!razorpay_payment_id || !phone) {
      return res.status(400).send('Missing payment details');
    }
  const payment = await razorpay.payments.fetch(razorpay_payment_id);
    
    if (payment.status !== 'captured') {
      return res.status(400).send('Payment not captured');
    }

    if (payment.order_id !== razorpay_order_id) {
      return res.status(400).send('Order ID mismatch');
    }

    const user = userContext[phone];
    if (!user) {
      return res.status(404).send('User not found');
    }



      
    const schemes = getEligibleSchemes(user.responses);

    // Send scheme details
    let initialMessage = '';
    if (user.language === '1') {
      initialMessage = `✅ भुगतान सफल! आप ${schemes.length} योजनाओं के पात्र हैं:`;
    } else if (user.language === '3') {
      initialMessage = `✅ पेमेंट यशस्वी! तुम्ही ${schemes.length} योजनांसाठी पात्र आहात:`;
    } else {
      initialMessage = `✅ Payment successful! You're eligible for ${schemes.length} schemes:`;
    }
    await sendMessage(userPhone, initialMessage);

    // Send schemes in batches
    for (let i = 0; i < schemes.length; i++) {
      let schemeMessage = '';
      if (user.language === '1') {
        schemeMessage = `\n${i+1}. ${schemes[i].SchemeName}\n🔗 आवेदन: ${schemes[i].OfficialLink}\n📝 तरीका: ${schemes[i].ApplicationMode}`;
      } else if (user.language === '3') {
        schemeMessage = `\n${i+1}. ${schemes[i].SchemeName}\n🔗 अर्ज: ${schemes[i].OfficialLink}\n📝 पद्धत: ${schemes[i].ApplicationMode}`;
      } else {
        schemeMessage = `\n${i+1}. ${schemes[i].SchemeName}\n🔗 Apply: ${schemes[i].OfficialLink}\n📝 Mode: ${schemes[i].ApplicationMode}`;
      }
      
      await sendMessage(userPhone, schemeMessage);
      
    for (let i = 0; i < schemeMessages.length; i++) {
      await sendMessage(phone, schemeMessages[i]);
      if (i % 2 === 0) await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Clear user context
    delete userContext[phone];
    
    res.status(200).json({ 
      success: true,
      schemes: eligibleSchemes.length
    });
  } catch (error) {
    console.error('Payment success error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

app.get('/', (req, res) => {
  res.send('✅ ApnaScheme Bot is running');
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
