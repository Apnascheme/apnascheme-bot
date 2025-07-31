// Use your server's payment endpoint instead of external Razorpay link
    const paymentUrl = `${req.protocol}://${req.get('host')}/payment?phone=${phone}`;
    
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
                    + `फक्त ₹49import express from 'express';
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

    return true;
  });
}

const mapAnswer = (lang, qIndex, rawInput) => {
  const mapping = OPTION_MAPPINGS[lang]?.[qIndex];
  return mapping?.[rawInput] || rawInput;
};

// Enhanced sendMessage function with proper logging
const sendMessage = async (phone, msg) => {
  try {
  const phone = req.body.phone; // or wherever it comes from
console.log(`[WHATSAPP ATTEMPT] To: ${phone}, Message Length: ${String(msg).length} chars`);
}
}

    
    const encodedMessage = encodeURIComponent(msg);
    const url = `${BASE_URL}?channel=whatsapp&source=${GUPSHUP_PHONE_NUMBER}&destination=${phone}&message=${encodedMessage}&src.name=ApnaSchemeTechnologies`;
    
    const response = await axios.post(url, null, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        apikey: GUPSHUP_APP_TOKEN
      }
    });
    
    console.log(`[WHATSAPP SENT] To: ${phone}, Status: ${response.data.status}, Response: ${JSON.stringify(response.data)}`);
    return response.data;
  } catch (error) {
    console.error(`[WHATSAPP ERROR] To: ${phone}`, error.response?.data || error.message);
    throw error;
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

  console.log(`[GUPSHUP WEBHOOK] Phone: ${phone}, Message: ${msg}`);

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

  console.log(`[USER PROGRESS] Phone: ${phone}, Question: ${qIndex + 1}, Response: ${mapped}`);

  const next = getNextQuestion(user);
  if (next) {
    await sendMessage(phone, next);
  } else {
    const eligibleSchemes = getEligibleSchemes(user.responses);
    
    console.log(`[QUESTIONNAIRE COMPLETE] Phone: ${phone}, Eligible Schemes: ${eligibleSchemes.length}`);
    
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
    
    console.log(`[RAZORPAY ORDER] Phone: ${phone}, Amount: ₹${amount}`);
    
    // Validate input
    if (!phone || !amount) {
      return res.status(400).json({ error: 'Phone and amount are required' });
    }

    const options = {
      amount: amount * 100, // Convert rupees to paise
      currency: "INR",
      receipt: `order_${Date.now()}_${phone}`,
      notes: { 
        phone,
        purpose: 'Scheme Eligibility Report' 
      },
      payment_capture: 1 // Auto-capture payments
    };

    const order = await razorpay.orders.create(options);
    
    console.log(`[RAZORPAY ORDER CREATED] Order ID: ${order.id}, Phone: ${phone}`);
    
    res.json({
      id: order.id,
      currency: order.currency,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error("[RAZORPAY ORDER ERROR]", error);
    res.status(500).json({ error: "Payment processing error" });
  }
});

// Enhanced payment success handler with comprehensive logging
app.post('/payment-success', async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, phone } = req.body;
    
    console.log(`[PAYMENT SUCCESS REQUEST] Full body:`, JSON.stringify(req.body, null, 2));
    console.log(`[PAYMENT SUCCESS] Payment ID: ${razorpay_payment_id}, Order ID: ${razorpay_order_id}, Phone: ${phone}`);
    
    // Validate input
    if (!razorpay_payment_id || !phone) {
      console.error(`[PAYMENT ERROR] Missing payment details - Payment ID: ${razorpay_payment_id}, Phone: ${phone}`);
      console.error(`[PAYMENT ERROR] Full request body:`, req.body);
      return res.status(400).json({ 
        error: 'Missing payment details',
        received: {
          payment_id: razorpay_payment_id,
          phone: phone,
          full_body: req.body
        }
      });
    }

    // Check if user context exists
    if (!userContext[phone]) {
      console.error(`[PAYMENT ERROR] No user context found for phone: ${phone}`);
      console.log(`[DEBUG] Available user contexts: ${Object.keys(userContext)}`);
      return res.status(404).json({ 
        success: false, 
        error: 'User context not found. Please restart the questionnaire.',
        available_contexts: Object.keys(userContext).length
      });
    }

    console.log(`[USER CONTEXT FOUND] Phone: ${phone}, Language: ${userContext[phone].language}, Responses: ${userContext[phone].responses.length}`);

    // Verify payment with Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    console.log(`[RAZORPAY VERIFICATION] Payment Status: ${payment.status}, Amount: ₹${payment.amount/100}`);
    
    if (payment.status !== 'captured') {
      console.error(`[PAYMENT ERROR] Payment not captured: ${payment.status}`);
      return res.status(400).json({ error: 'Payment not captured' });
    }

    if (payment.order_id !== razorpay_order_id) {
      console.error(`[PAYMENT ERROR] Order ID mismatch: Expected ${razorpay_order_id}, Got ${payment.order_id}`);
      return res.status(400).json({ error: 'Order ID mismatch' });
    }

    const user = userContext[phone];
    const eligibleSchemes = getEligibleSchemes(user.responses);
    
    console.log(`[SCHEMES CALCULATION] Phone: ${phone}, Eligible Schemes: ${eligibleSchemes.length}`);

    // Send confirmation message first
    let initialMsg = '';
    if (user.language === '1') {
      initialMsg = `✅ भुगतान सफल! आप ${eligibleSchemes.length} योजनाओं के पात्र हैं:\n\n`;
    } else if (user.language === '3') {
      initialMsg = `✅ पेमेंट यशस्वी! तुम्ही ${eligibleSchemes.length} योजनांसाठी पात्र आहात:\n\n`;
    } else {
      initialMsg = `✅ Payment successful! You're eligible for ${eligibleSchemes.length} schemes:\n\n`;
    }

    // Send initial confirmation
    await sendMessage(phone, initialMsg);
    console.log(`[CONFIRMATION SENT] Phone: ${phone}`);

    // Send scheme details with better error handling
    let sentCount = 0;
    for (let i = 0; i < eligibleSchemes.length; i++) {
      try {
        const scheme = eligibleSchemes[i];
        let schemeMsg = '';
        
        if (user.language === '1') {
          schemeMsg = `${i+1}. ${scheme.SchemeName}\n🔗 ${scheme.OfficialLink || 'आवेदन लिंक उपलब्ध नहीं'}\n📝 ${scheme.ApplicationMode || 'ऑनलाइन/ऑफलाइन'}`;
        } else if (user.language === '3') {
          schemeMsg = `${i+1}. ${scheme.SchemeName}\n🔗 ${scheme.OfficialLink || 'अर्ज लिंक उपलब्ध नाही'}\n📝 ${scheme.ApplicationMode || 'ऑनलाइन/ऑफलाइन'}`;
        } else {
          schemeMsg = `${i+1}. ${scheme.SchemeName}\n🔗 ${scheme.OfficialLink || 'Application link not available'}\n📝 ${scheme.ApplicationMode || 'Online/Offline'}`;
        }
        
        await sendMessage(phone, schemeMsg);
        sentCount++;
        console.log(`[SCHEME SENT] ${i+1}/${eligibleSchemes.length} - ${scheme.SchemeName}`);
        
        // Add delay every 2 messages to avoid rate limiting
        if (i % 2 === 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`[SCHEME SEND ERROR] Scheme ${i+1}: ${error.message}`);
        // Continue with next scheme even if one fails
      }
    }

    // Send completion message
    let completionMsg = '';
    if (user.language === '1') {
      completionMsg = `🎉 सभी ${sentCount} योजनाओं की जानकारी भेज दी गई!\n\nधन्यवाद ApnaScheme का उपयोग करने के लिए! 🙏`;
    } else if (user.language === '3') {
      completionMsg = `🎉 सर्व ${sentCount} योजनांची माहिती पाठवली!\n\nApnaScheme वापरल्याबद्दल धन्यवाद! 🙏`;
    } else {
      completionMsg = `🎉 All ${sentCount} scheme details sent!\n\nThank you for using ApnaScheme! 🙏`;
    }
    
    await sendMessage(phone, completionMsg);
    console.log(`[COMPLETION MESSAGE SENT] Phone: ${phone}, Total schemes sent: ${sentCount}`);

    // Clear user context after successful delivery
    delete userContext[phone];
    console.log(`[USER CONTEXT CLEARED] Phone: ${phone}`);
    
    res.status(200).json({ 
      success: true,
      schemes_eligible: eligibleSchemes.length,
      schemes_sent: sentCount,
      message: 'Payment successful and schemes delivered'
    });
    
  } catch (error) {
    console.error('[PAYMENT SUCCESS ERROR]', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process payment success',
      details: error.message 
    });
  }
});

// Add endpoint to check user context (for debugging)
app.get('/debug/user-context/:phone', (req, res) => {
  const phone = req.params.phone;
  const context = userContext[phone];
  
  res.json({
    phone,
    exists: !!context,
    context: context || null,
    total_active_users: Object.keys(userContext).length,
    active_phones: Object.keys(userContext)
  });
});

// Serve payment page
app.get('/payment', (req, res) => {
  const phone = req.query.phone || req.query['prefill[contact]'] || req.query['notes[phone]'];
  
  console.log(`[PAYMENT PAGE REQUEST] Phone: ${phone}, All params:`, req.query);
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ApnaScheme - Payment</title>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 15px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            text-align: center;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }
        .phone-display {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            border: 2px solid #e9ecef;
        }
        .features {
            text-align: left;
            background: #f9f9f9;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .features ul {
            margin: 0;
            padding-left: 20px;
        }
        .features li {
            margin-bottom: 8px;
            color: #495057;
        }
        .pay-button {
            background: #28a745;
            color: white;
            border: none;
            padding: 15px 40px;
            border-radius: 8px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            margin: 20px 0;
        }
        .pay-button:hover {
            background: #218838;
            transform: translateY(-2px);
        }
        .pay-button:disabled {
            background: #6c757d;
            cursor: not-allowed;
            transform: none;
        }
        .loading {
            display: none;
            margin: 20px 0;
        }
        .error {
            color: #dc3545;
            background: #f8d7da;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            display: none;
        }
        .success {
            color: #155724;
            background: #d4edda;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🇮🇳 ApnaScheme</div>
        <h2>Government Scheme Report</h2>
        <p>Get your personalized eligibility report</p>
        
        <div class="phone-display">
            <strong>📱 WhatsApp Number:</strong>
            <div id="phoneDisplay" style="font-size: 18px; color: #667eea; margin-top: 5px;">${phone || 'Not detected'}</div>
        </div>
        
        <div class="features">
            <h3>🎯 What you'll receive:</h3>
            <ul>
                <li>✅ Complete list of eligible government schemes</li>
                <li>🔗 Direct application links for each scheme</li>
                <li>📝 Application mode details (Online/Offline)</li>
                <li>⚡ Instant delivery to your WhatsApp</li>
                <li>💼 Personalized based on your profile</li>
            </ul>
        </div>
        
        <div style="font-size: 24px; color: #28a745; font-weight: bold; margin: 20px 0;">
            Only ₹49
        </div>
        
        <button id="payButton" class="pay-button" onclick="startPayment()" ${!phone ? 'disabled' : ''}>
            💳 Pay ₹49 & Get Schemes
        </button>
        
        <div id="loading" class="loading">
            <div class="spinner"></div>
            <p>Processing payment...</p>
        </div>
        
        <div id="error" class="error">${!phone ? 'Phone number not found. Please restart from WhatsApp.' : ''}</div>
        
        <p style="font-size: 12px; color: #6c757d; margin-top: 20px;">
            🔒 Secure payment powered by Razorpay
        </p>
    </div>

    <script>
        const userPhone = '${phone || ''}';
        
        function showError(message) {
            const errorDiv = document.getElementById('error');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
        
        function hideError() {
            document.getElementById('error').style.display = 'none';
        }
        
        function showLoading(show = true) {
            document.getElementById('loading').style.display = show ? 'block' : 'none';
            document.getElementById('payButton').disabled = show;
        }
        
        async function createOrder() {
            try {
                showLoading(true);
                hideError();
                
                const response = await fetch('/create-razorpay-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        phone: userPhone,
                        amount: 49
                    })
                });

                const orderData = await response.json();
                
                if (!response.ok) {
                    throw new Error(orderData.error || 'Failed to create order');
                }

                console.log('Order created:', orderData);
                return orderData;
            } catch (error) {
                console.error('Order creation failed:', error);
                showError('Failed to create payment order. Please try again.');
                return null;
            } finally {
                showLoading(false);
            }
        }
        
        async function startPayment() {
            if (!userPhone) {
                showError('Phone number not found. Please restart from WhatsApp.');
                return;
            }

            const orderData = await createOrder();
            if (!orderData) return;

            const options = {
                key: orderData.key,
                amount: orderData.amount,
                currency: orderData.currency,
                order_id: orderData.id,
                name: 'ApnaScheme',
                description: 'Government Scheme Eligibility Report',
                prefill: {
                    contact: userPhone
                },
                notes: {
                    phone: userPhone
                },
                handler: async function (response) {
                    console.log('Payment successful:', response);
                    await handlePaymentSuccess(response);
                },
                modal: {
                    ondismiss: function() {
                        console.log('Payment modal closed');
                        showLoading(false);
                    }
                },
                theme: {
                    color: '#667eea'
                }
            };

            const rzp = new Razorpay(options);
            
            rzp.on('payment.failed', function (response) {
                console.error('Payment failed:', response.error);
                showError('Payment failed: ' + response.error.description);
                showLoading(false);
            });

            showLoading(true);
            rzp.open();
        }
        
        async function handlePaymentSuccess(response) {
            try {
                showLoading(true);
                
                console.log('Sending payment success data:', {
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                    phone: userPhone
                });
                
                const successResponse = await fetch('/payment-success', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_signature: response.razorpay_signature,
                        phone: userPhone
                    })
                });

                const result = await successResponse.json();
                console.log('Payment success response:', result);
                
                if (successResponse.ok && result.success) {
                    document.querySelector('.container').innerHTML = \`
                        <div class="success">
                            <h1 style="color: #28a745; margin: 0 0 20px 0;">✅ Payment Successful!</h1>
                            <p style="font-size: 18px; margin: 15px 0;">
                                <strong>Payment ID:</strong> \${response.razorpay_payment_id}
                            </p>
                            <p style="font-size: 18px; margin: 15px 0;">
                                <strong>WhatsApp:</strong> \${userPhone}
                            </p>
                            <div style="background: #e7f3ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                                <h3 style="margin: 0 0 15px 0; color: #0066cc;">📱 Check Your WhatsApp</h3>
                                <p>You're eligible for <strong>\${result.schemes_eligible}</strong> government schemes!</p>
                                <p>All scheme details with direct application links are being sent to your WhatsApp now.</p>
                            </div>
                            <p style="margin-top: 30px; color: #6c757d;">
                                Thank you for using ApnaScheme! 🙏
                            </p>
                        </div>
                    \`;
                } else {
                    throw new Error(result.error || 'Payment processing failed');
                }
            } catch (error) {
                console.error('Payment success processing failed:', error);
                showError('Payment was successful, but there was an issue delivering your schemes. Please contact support with Payment ID: ' + response.razorpay_payment_id);
            } finally {
                showLoading(false);
            }
        }
        
        window.addEventListener('load', function() {
            if (!userPhone) {
                document.getElementById('error').style.display = 'block';
                document.getElementById('payButton').disabled = true;
            }
            console.log('Page loaded with phone:', userPhone);
        });
    </script>
</body>
</html>`;
  
  res.send(html);
});

app.get('/', (req, res) => {
  res.send('✅ ApnaScheme Bot is running');
});

app.listen(PORT, async () => {
  try {
    await loadSchemes();
    console.log(`🚀 Server live on port ${PORT} | ${schemes.length} schemes loaded`);
    console.log(`📱 WhatsApp API: ${BASE_URL}`);
    console.log(`💳 Razorpay: ${process.env.RAZORPAY_KEY_ID ? 'Configured' : 'Not configured'}`);
  } catch (err) {
    console.error('Failed to load schemes:', err);
    process.exit(1);
  }
});
