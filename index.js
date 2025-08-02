import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import ExcelJS from 'exceljs';
import crypto from 'crypto'; 
import Razorpay from 'razorpay';
import bodyParser from 'body-parser';

dotenv.config();

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use('/razorpay-webhook', bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Constants
const PORT = process.env.PORT || 3000;
const BASE_URL = 'https://api.gupshup.io/sm/api/v1/msg';
const GUPSHUP_APP_TOKEN = process.env.GUPSHUP_APP_TOKEN;
const GUPSHUP_PHONE_NUMBER = process.env.GUPSHUP_PHONE_NUMBER;

// Data Stores
const userContext = {};
let schemes = [];

// Questions and Mappings
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

// Helper Functions
async function loadSchemes() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('ApnaScheme_Phase1_50_Scheme_Template.xlsx');
  const worksheet = workbook.getWorksheet(1);
  
  schemes = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    
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

function getEligibleSchemes(userResponses, hasCriticalIllness = false) {
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
    if (womenSchemes.some(word => schemeNameLower.includes(word)) &&
        !['female', 'महिला', 'स्त्री', 'woman', 'girl'].includes(genderLower)) {
      return false;
    }

    // Disability-specific schemes
    const disabilitySchemes = ['disability', 'divyang', 'viklang', 'udid', 'adip'];
    if (disabilitySchemes.some(word => schemeNameLower.includes(word)) &&
        !occupationLower.includes('disabled')) {
      return false;
    }

    // Maternity/health schemes
    const maternitySchemes = ['janani', 'matru', 'maternity'];
    if (maternitySchemes.some(word => schemeNameLower.includes(word)) &&
        (genderLower !== 'female' || age < 13 || age > 50)) {
      return false;
    }

    // Rashtriya Arogya Nidhi check
    if (schemeNameLower.includes('rashtriya arogya nidhi') && !hasCriticalIllness) {
      return false;
    }

    // Occupation filtering
    if (scheme.EmploymentFilter && scheme.EmploymentFilter !== 'All') {
      const schemeOccupation = scheme.EmploymentFilter.toLowerCase();
      if (!occupationLower.includes(schemeOccupation)) {
        return false;
      }
    }

    // State filtering
    if (schemeState !== 'all india' && schemeState !== userState) return false;

    // Age range
    const minAge = scheme.MinAge || 0;
    const maxAge = scheme.MaxAge || 100;
    if (age < minAge || age > maxAge) return false;

    // Income check
    if (scheme.IncomeLimit && income > scheme.IncomeLimit) return false;

    // Caste filtering
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

    // Aadhaar/Ration required
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

  if (lang === '1') {
    if (occupation === '1') occupation = 'छात्र';
    else if (occupation === '2') occupation = 'बेरोज़गार';
    else if (occupation === '3') occupation = 'नौकरीपेशा';
    else if (occupation === '4') occupation = 'अन्य';
  } else if (lang === '2') {
    if (occupation === '1') occupation = 'student';
    else if (occupation === '2') occupation = 'unemployed';
    else if (occupation === '3') occupation = 'employed';
    else if (occupation === '4') occupation = 'other';
  } else if (lang === '3') {
    if (occupation === '1') occupation = 'विद्यार्थी';
    else if (occupation === '2') occupation = 'बेरोजगार';
    else if (occupation === '3') occupation = 'नोकरी करता';
    else if (occupation === '4') occupation = 'इतर';
  }

  if (res.length === 3) return q[3];
  if (res.length === 4) return q[4];
  if (res.length === 5) return q[5];
  if (res.length === 6) return q[6];
  if (res.length === 7) return q[7];
  
  return null;
};

// Routes
app.get('/', (req, res) => {
  res.send('✅ ApnaScheme Bot is running with scheme eligibility filtering');
});

// Razorpay Payment Flow
app.get('/order', async (req, res) => {
  const { phone } = req.query;
  const options = {
    amount: 100,
    currency: 'INR',
    receipt: `rcpt_${phone}_${Date.now()}`,
    notes: { phone }
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json({ 
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (err) {
    console.error("Razorpay order error:", err);
    res.status(500).json({ error: 'Order creation failed' });
  }
});

app.get('/pay', async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).send('Phone number required');

  const html = `
    <html>
    <head>
      <title>Pay ₹1 - ApnaScheme</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
        .loader { margin: 50px auto; border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .error { color: red; }
      </style>
    </head>
    <body>
      <h2>ApnaScheme Eligibility Plan</h2>
      <p>One-time payment of ₹49</p>
      <div id="payment-status">
        <div class="loader"></div>
        <p>Loading payment...</p>
      </div>

      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      <script>
        const phone = '${phone}';
        const paymentStatus = document.getElementById('payment-status');
        
        fetch('/order?phone=' + phone)
          .then(res => res.json())
          .then(data => {
            if (data.error) {
              paymentStatus.innerHTML = '<p class="error">Payment setup failed. Please try again.</p>';
              return;
            }

            const options = {
              key: '${process.env.RAZORPAY_KEY_ID}',
              amount: data.amount,
              currency: data.currency,
              name: 'ApnaScheme',
              description: '₹1 Eligibility Plan',
              order_id: data.orderId,
              handler: function(response) {
                window.location.href = '/success?phone=' + phone;
              },
              prefill: {
                contact: phone
              },
              theme: {
                color: '#3399cc'
              },
              modal: {
                ondismiss: function() {
                  window.location.href = 'https://wa.me/917977594397' + phone;
                }
              }
            };

            const rzp = new Razorpay(options);
            rzp.open();
            
            rzp.on('payment.failed', function(response) {
              paymentStatus.innerHTML = '<p class="error">Payment failed. Please try again.</p>' +
                '<a href="https://wa.me/917977594397' + phone + '">Return to WhatsApp</a>';
            });
          })
          .catch(err => {
            console.error('Payment error:', err);
            paymentStatus.innerHTML = '<p class="error">Payment setup failed. Please try again later.</p>' +
              '<a href="https://wa.me/917977594397' + phone + '">Return to WhatsApp</a>';
          });
      </script>
    </body>
    </html>
  `;
  res.send(html);
});

app.get('/success', (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).send('Phone number required');

  res.send(`
    <html>
    <head>
      <title>Payment Successful - ApnaScheme</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
        .success { color: green; font-size: 24px; }
        .whatsapp-btn { 
          display: inline-block; 
          background-color: #25D366; 
          color: white; 
          padding: 10px 20px; 
          text-decoration: none; 
          border-radius: 5px; 
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="success">✅ Payment Successful!</div>
      <p>Thank you for your payment of ₹49.</p>
      <p>Your scheme details will be sent to you shortly on WhatsApp.</p>
      <a href="https://wa.me/91${phone}" class="whatsapp-btn">Open WhatsApp</a>
    </body>
    </html>
  `);
});

app.post('/razorpay-webhook', bodyParser.raw({type: 'application/json'}), async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const razorpaySignature = req.headers['x-razorpay-signature'];
    
    if (!req.rawBody) {
      console.log('⚠️ Raw body missing');
      return res.status(400).send('Missing raw body');
    }

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(req.rawBody);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpaySignature) {
      console.warn('⚠️ Invalid Razorpay signature');
      return res.status(401).send('Unauthorized');
    }

    console.log('✅ Webhook signature verified');
    
    const webhookBody = JSON.parse(req.rawBody.toString());
    const payment = webhookBody?.payload?.payment?.entity;

    if (!payment || payment.status !== 'captured') {
      console.warn('❌ Not a captured payment');
      return res.status(400).send('Invalid payment');
    }

    const phone = payment.notes?.phone;
    if (!phone || !userContext[phone]) {
      console.warn('❌ Phone number missing or user not found');
      return res.status(400).send('Phone number required');
    }

    console.log('✅ Payment verified for phone:', phone);

    const user = userContext[phone];
    const eligibleSchemes = getEligibleSchemes(user.responses);
    const lang = user.language || '2';

    let message;
    if (lang === '1') {
      message = `✅ भुगतान सफल!\n\nआपकी योजनाएं (${eligibleSchemes.length}):\n\n`;
      eligibleSchemes.forEach(scheme => {
        message += `• ${scheme.SchemeName}\n🔗 आवेदन: ${scheme.OfficialLink}\n📝 तरीका: ${scheme.ApplicationMode}\n\n`;
      });
      message += `📄 रसीद ID: ${payment.id}`;
    } else if (lang === '3') {
      message = `✅ पेमेंट यशस्वी!\n\nतुमच्या योजना (${eligibleSchemes.length}):\n\n`;
      eligibleSchemes.forEach(scheme => {
        message += `• ${scheme.SchemeName}\n🔗 अर्ज: ${scheme.OfficialLink}\n📝 पद्धत: ${scheme.ApplicationMode}\n\n`;
      });
      message += `📄 पावती ID: ${payment.id}`;
    } else {
      message = `✅ Payment Successful!\n\nYour Schemes (${eligibleSchemes.length}):\n\n`;
      eligibleSchemes.forEach(scheme => {
        message += `• ${scheme.SchemeName}\n🔗 Apply: ${scheme.OfficialLink}\n📝 Mode: ${scheme.ApplicationMode}\n\n`;
      });
      message += `📄 Receipt ID: ${payment.id}`;
    }

    await sendMessage(phone, message);
    console.log(`📩 Sent schemes to ${phone}`);

    delete userContext[phone];
    res.status(200).send('Success');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Server error');
  }
});

// Gupshup WhatsApp Integration
app.post('/gupshup', express.json(), async (req, res) => {
  try {
    if (!req.body || !req.body.payload) {
      console.warn('Invalid request structure', req.body);
      return res.status(400).send('Invalid request structure');
    }

    const data = req.body.payload;
    const phone = data?.sender?.phone;
    const msg = data?.payload?.text?.toLowerCase()?.trim() || '';

    if (!phone) {
      console.warn('Missing phone number in request');
      return res.status(400).send('Missing phone number');
    }

    if (!userContext[phone]) {
      if (msg.includes('1')) {
        userContext[phone] = { language: '1', responses: [] };
      } else if (msg.includes('2')) {
        userContext[phone] = { language: '2', responses: [] };
      } else if (msg.includes('3')) {
        userContext[phone] = { language: '3', responses: [] };
      } else {
        await sendMessage(phone, 
          "Namaste! Main hoon ApnaScheme – aapka digital dost 🇮🇳\n" +
          "Main aapko batata hoon kaunsi Sarkari Yojana aapke liye hai – bina agent, bina form, bina confusion.\n\n" +
          "🗣️ Apni bhaasha chunein\n(Please select 1, 2, 3 to answer):\n" +
          "1. हिंदी\n2. English\n3. मराठी"
        );
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
      const paymentUrl = `${req.protocol}://${req.get('host')}/pay?phone=${phone}`;
      const eligibleSchemes = getEligibleSchemes(user.responses);
      
      let closingMessage = "";
      if (user.language === '1') {
        closingMessage = `आप ${eligibleSchemes.length} सरकारी योजनाओं के लिए पात्र हैं!\n\n` +
                      `सिर्फ ₹49 में पाएं:\n` +
                      `आपके लिए सभी योजनाओं की पूरी लिस्ट\n` +
                      `सीधे आवेदन करने के लिंक\n\n` +
                      `अभी पेमेंट करें: \n${paymentUrl}\n\n` +
                      `ऑफर सीमित समय के लिए!`;
      } else if (user.language === '2') {
        closingMessage = `You're eligible for ${eligibleSchemes.length} government schemes!\n\n` +
                      `For just ₹49 get:\n` +
                      `Complete list of all schemes\n` +
                      `Direct application links\n\n` +
                      `Make payment now: \n${paymentUrl}\n\n` +
                      `Limited time offer!`;
      } else {
        closingMessage = `तुम्ही ${eligibleSchemes.length} सरकारी योजनांसाठी पात्र आहात!\n\n` +
                      `फक्त ₹49 मध्ये मिळवा:\n` +
                      `तुमच्यासाठी सर्व योजनांची संपूर्ण यादी\n` +
                      `थेट अर्ज करण्याचे लिंक\n\n` +
                      `आत्ताच पेमेंट करा: \n${paymentUrl}\n\n` +
                      `मर्यादित वेळ ऑफर!`;
      }

      await sendMessage(phone, closingMessage);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error in /gupshup endpoint:', error);
    res.status(500).send('Internal server error');
  }
});

// Start Server
app.listen(PORT, async () => {
  try {
    await loadSchemes();
    console.log(`🚀 Server live on port ${PORT} | ${schemes.length} schemes loaded`);
  } catch (err) {
    console.error('Failed to load schemes:', err);
    process.exit(1);
  }
});
