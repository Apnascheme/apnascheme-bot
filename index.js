import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import ExcelJS from 'exceljs';
import crypto from 'crypto'; 
import Razorpay from 'razorpay';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';

dotenv.config();

const app = express();

// MongoDB Connection
// Updated MongoDB connection with better error handling
const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      w: 'majority'
    });
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

// Call this when starting your app
connectDB();

// MongoDB User Schema
const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  language: String,
  age: String,
  gender: String,
  occupation: String,
  income: String,
  bankAccount: String,
  rationcard: String,
  state: String,
  eligibilityCount: Number,
  referralCode: String,
  referredBy: { type: String, default: null },
  paymentStatus: { type: String, default: 'pending' },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  responses: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  hasReceivedSchemes: {
    type: Boolean,
    default: false
  },
  referralCount: { type: Number, default: 0 },
  referralRewardedSets: { type: Number, default: 0 },
  referralRewarded: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

// Helper function to generate referral code
function generateReferralCode(phone) {
  return 'REF' + phone.slice(-4) + Math.floor(1000 + Math.random() * 9000).toString().slice(0, 2);
}

// Helper function to get user by phone
async function getUserByPhone(phone) {
  return await User.findOne({ phone });
}

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
    "आपका लिंग क्या है?\n(जवाब दें 1/2/3)\n1. पुरुष\n2. महिला\n3. अन्य",
    "आपकी उम्र कितनी है?\n(केवल संख्या में लिखें, जैसे: 18)",
    "आप क्या करते हैं?\n(जवाब दें 1/2/3/4)\n1. छात्र\n2. बेरोज़गार\n3. नौकरीपेशा\n4.दिव्यांग",
    "आपके परिवार की सालाना आय कितनी है?\n(केवल संख्या में लिखें, जैसे: 120000)",
    "क्या आपका बैंक खाता है?\n(जवाब दें 1/2)\n1. हाँ\n2. नहीं",
    "क्या आपके पास राशन कार्ड है?\n(जवाब दें 1/2)\n1. हाँ\n2. नहीं",
    "आपका राज्य कौन सा है?\n(उदाहरण: महाराष्ट्र)",
    "क्या आप SC/ST/OBC/EWS श्रेणी में आते हैं?\n(जवाब दें 1/2)\n1. हाँ\n2. नहीं"
  ],
  2: [
    "What is your gender?\n(Reply 1/2/3)\n1. Male\n2. Female\n3. Other",
    "What is your age?\n (Enter number eg. 18)",
    "What do you do?\n(Reply 1/2/3/4)\n1. Student\n2. Unemployed\n3. Employed\n4. Disabled",
    "What is your Household yearly income?\n (eg. 120000)",
    "Do you have a bank account?\n(Reply 1/2)\n1. Yes\n2. No",
    "Do you have a ration card?\n(Reply 1/2)\n1. Yes\n2. No",
    "Which state do you live in?\n (eg. Maharashtra)",
    "Do you belong to SC/ST/OBC/EWS category?\n(Reply 1/2)\n1. Yes\n2. No"
  ],
  3: [
    "तुमचं लिंग काय आहे?\n(उत्तर द्या 1/2/3)\n1.पुरुष\n2.महिला\n3.इतर",
    "तुमचं वय किती आहे?\n(उदाहरण: 18)",
    "तुम्ही काय करता?\n(उत्तर द्या 1/2/3/4)\n1. विद्यार्थी\n2. बेरोजगार\n3. नोकरी करता\n4. दिव्यांग",
    "तुमच्या कुटुंबाचे वार्षिक उत्पन्न किती आहे?\n(फक्त संख्या लिहा, उदा: 120000)",
    "तुमचं बँक खाते आहे का?\n(उत्तर द्या 1/2)\n1. होय\n2. नाही",
    "तुमच्याकडे रेशन कार्ड आहे का?\n(उत्तर द्या 1/2)n1. होय\n2. नाही",
    "तुमचं राज्य कोणतं?\n(उदा: महाराष्ट्र)",
    "तुम्ही SC/ST/OBC/EWS प्रवर्गात मोडता का?\n(उत्तर द्या 1/2)\n1. होय\n2. नाही"
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
    if (rowNumber === 1) return; // Skip header
    
    const linkCell = row.getCell(12);
    let officialLink = '';
    
    if (linkCell.value) {
      if (typeof linkCell.value === 'string') {
        officialLink = linkCell.value.trim();
      } else if (linkCell.value.text) {
        officialLink = linkCell.value.text.trim();
      } else if (linkCell.value.hyperlink) {
        officialLink = linkCell.value.hyperlink.trim();
      }
    }

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
      OfficialLink: officialLink,
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
  try {
    const response = await axios.post(BASE_URL, null, {
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
      },
      timeout: 10000
    });

    console.log('Message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', {
      phone: phone,
      error: error.response?.data || error.message,
      messageContent: msg.substring(0, 100) + '...'
    });
    throw error;
  }
};

const getNextQuestion = (user) => {
  const lang = user.language;
  const q = QUESTIONS[lang];
  const res = user.responses;

  if (res.length === 0) return q[0];
  if (res.length === 1) return q[1];
  if (res.length === 2) return q[2];
  if (res.length === 3) return q[3];
  if (res.length === 4) return q[4];
  if (res.length === 5) return q[5];
  if (res.length === 6) return q[6];
  if (res.length === 7) return q[7];
  
  return null;
};

// Routes
app.get('/', (req, res) => {
  res.send('✅ ApnaScheme Bot is running with MongoDB integration');
});

// Razorpay Payment Flow
app.get('/order', async (req, res) => {
  const { phone } = req.query;
  
  try {
    // Find user in MongoDB
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const options = {
      amount: 100, // ₹49 in paise
      currency: 'INR',
      receipt: `rcpt_${phone}_${Date.now()}`,
      notes: { phone }
    };

    const order = await razorpay.orders.create(options);
    
    // Update user with order ID
    user.razorpayOrderId = order.id;
    await user.save();

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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>₹1 Eligibility Plan - ApnaScheme</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #2563EB;
            --primary-light: #DBEAFE;
            --error: #DC2626;
            --text-dark: #1F2937;
            --text-medium: #4B5563;
            --text-light: #6B7280;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', system-ui, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 2rem;
            background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%);
            color: var(--text-medium);
            line-height: 1.5;
        }
        
        .card {
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            padding: 3rem;
            max-width: 420px;
            width: 100%;
            text-align: center;
            position: relative;
            overflow: hidden;
            transform: translateY(0);
            animation: floatUp 0.6s ease-out forwards;
        }
        
        .card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
            background: linear-gradient(90deg, var(--primary) 0%, #3B82F6 100%);
        }
        
        h2 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: var(--text-dark);
        }
        
        .price {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--primary);
            margin-bottom: 2rem;
        }
        
        .payment-status {
            min-height: 180px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        
        .loader {
            width: 60px;
            height: 60px;
            border: 5px solid var(--primary-light);
            border-top: 5px solid var(--primary);
            border-radius: 50%;
            animation: spin 1.2s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite;
            margin-bottom: 1.5rem;
        }
        
        .status-text {
            font-size: 1.1rem;
            color: var(--text-medium);
            margin-bottom: 1.5rem;
        }
        
        .error {
            color: var(--error);
            font-weight: 500;
        }
        
        .whatsapp-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background-color: #25D366;
            color: white;
            padding: 0.75rem 1.5rem;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            transition: all 0.3s ease;
            margin-top: 1rem;
        }
        
        .whatsapp-btn:hover {
            background-color: #128C7E;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(37, 211, 102, 0.2);
        }
        
        @keyframes floatUp {
            0% { transform: translateY(20px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .pulse {
            animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
        }
    </style>
</head>
<body>
    <div class="card">
        <h2>ApnaScheme Eligibility Plan</h2>
        <div class="price">One-time payment of ₹1</div>
        
        <div id="payment-status" class="payment-status">
            <div class="loader"></div>
            <p class="status-text pulse">Preparing payment gateway...</p>
        </div>
    </div>

    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <script>
        const phone = '${phone}';
        const paymentStatus = document.getElementById('payment-status');
        
        function updateStatus(text, isError = false) {
            paymentStatus.innerHTML = \`
                <p class="status-text \${isError ? 'error' : ''}">\${text}</p>
                \${isError ? '<a href="https://wa.me/917977594397' + phone + '" class="whatsapp-btn">Return to WhatsApp</a>' : ''}
            \`;
        }
        
        // Animate status text while loading
        const statusText = paymentStatus.querySelector('.status-text');
        const statusMessages = [
            "Preparing payment gateway...",
            "Almost ready...",
            "Setting up your plan..."
        ];
        let counter = 0;
        
        const textInterval = setInterval(() => {
            counter = (counter + 1) % statusMessages.length;
            statusText.textContent = statusMessages[counter];
        }, 2000);
        
        fetch('/order?phone=' + phone)
          .then(res => res.json())
          .then(data => {
            clearInterval(textInterval);
            
            if (data.error) {
              updateStatus("Payment setup failed. Please try again.", true);
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
                color: '#2563EB'
              },
              modal: {
                ondismiss: function() {
                  window.location.href = 'https://wa.me/917977594397' + phone;
                }
              }
            };

            updateStatus("Opening payment gateway...");
            const rzp = new Razorpay(options);
            rzp.open();
            
            rzp.on('payment.failed', function(response) {
              updateStatus("Payment failed. Please try again.", true);
            });
          })
          .catch(err => {
            clearInterval(textInterval);
            console.error('Payment error:', err);
            updateStatus("Payment setup failed. Please try again later.", true);
          });
    </script>
</body>
</html>`;

  res.send(html);
});

app.get('/success', (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).send('Phone number required');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Successful - ApnaScheme</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #10B981;
            --primary-light: #D1FAE5;
            --whatsapp: #25D366;
            --text-dark: #1F2937;
            --text-medium: #4B5563;
            --text-light: #6B7280;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', system-ui, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 2rem;
            background: linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%);
            color: var(--text-medium);
            line-height: 1.5;
        }
        
        .card {
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            padding: 3rem;
            max-width: 420px;
            width: 100%;
            text-align: center;
            position: relative;
            overflow: hidden;
            transform: translateY(0);
            animation: floatUp 0.6s ease-out forwards;
        }
        
        .card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
            background: linear-gradient(90deg, var(--primary) 0%, #3B82F6 100%);
        }
        
        .success-icon {
            width: 80px;
            height: 80px;
            background-color: var(--primary-light);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.75rem;
            animation: scaleIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }
        
        .success-icon svg {
            width: 40px;
            height: 40px;
            fill: var(--primary);
        }
        
        h1 {
            font-size: 1.75rem;
            font-weight: 700;
            margin: 0 0 1rem;
            color: var(--text-dark);
        }
        
        p {
            margin: 0.75rem 0;
            color: var(--text-medium);
            font-size: 1.05rem;
        }
        
        .amount {
            font-weight: 700;
            color: var(--text-dark);
            font-size: 1.2rem;
        }
        
        .whatsapp-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background-color: var(--whatsapp);
            color: white;
            padding: 0.9rem 2rem;
            text-decoration: none;
            border-radius: 12px;
            margin-top: 2rem;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(37, 211, 102, 0.2);
            width: 100%;
            max-width: 240px;
        }
        
        .whatsapp-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 20px rgba(37, 211, 102, 0.3);
            background-color: #128C7E;
        }
        
        .whatsapp-icon {
            margin-right: 10px;
            font-size: 1.4rem;
        }
        
        .confetti {
            position: absolute;
            width: 8px;
            height: 8px;
            background-color: var(--primary);
            opacity: 0;
            pointer-events: none;
        }
        
        @keyframes floatUp {
            0% { transform: translateY(20px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes scaleIn {
            0% { transform: scale(0); opacity: 0; }
            80% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes confettiFall {
            0% { 
                opacity: 1;
                transform: translateY(0) rotate(0deg); 
            }
            100% { 
                opacity: 0;
                transform: translateY(400px) rotate(360deg);
            }
        }
        
        .divider {
            height: 1px;
            background-color: #E5E7EB;
            margin: 1.5rem 0;
        }
        
        .contact {
            font-size: 0.9rem;
            color: var(--text-light);
            margin-top: 1.5rem;
        }
    </style>
</head>
<body>
    <div class="card" id="successCard">
        <div class="success-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
            </svg>
        </div>
        <h1>Payment Successful!</h1>
        <p>Thank you for your payment of <span class="amount">₹49</span></p>
        <p>Check your WhatsApp for the scheme details.</p>
        
        <div class="divider"></div>
        
        <a href="https://wa.me/7977594397}" class="whatsapp-btn">
            <span class="whatsapp-icon"></span>
            Check on WhatsApp
        </a>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];
            const card = document.getElementById('successCard');
            const confettiContainer = document.createElement('div');
            confettiContainer.style.position = 'absolute';
            confettiContainer.style.top = '0';
            confettiContainer.style.left = '0';
            confettiContainer.style.width = '100%';
            confettiContainer.style.height = '100%';
            confettiContainer.style.overflow = 'hidden';
            confettiContainer.style.pointerEvents = 'none';
            card.appendChild(confettiContainer);
            
            // Create confetti elements
            for (let i = 0; i < 40; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.top = '-10px';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.width = Math.random() * 8 + 4 + 'px';
                confetti.style.height = confetti.style.width;
                confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
                confetti.style.opacity = '1';
                
                // Random rotation and animation duration
                const rotation = Math.random() * 360;
                const duration = Math.random() * 1 + 1;
                const delay = Math.random() * 0.5;
                
                confetti.style.transform = \`rotate(\${rotation}deg)\`;
                confetti.style.animation = \`confettiFall \${duration}s ease-out \${delay}s forwards\`;
                
                confettiContainer.appendChild(confetti);
                
                // Remove confetti element after animation completes
                setTimeout(() => {
                    confetti.remove();
                }, (duration + delay) * 1000);
            }
            
            // Remove the container after all confetti is gone
            setTimeout(() => {
                confettiContainer.remove();
            }, 2000);
        });
    </script>
</body>
</html>`;

  res.send(html);
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
    if (!phone) {
      console.warn('❌ Phone number missing');
      return res.status(400).send('Phone number required');
    }

    // Load user from DB
    const user = await User.findOne({ phone });
    if (!user) {
      console.warn('❌ User not found in database');
      return res.status(404).send('User not found');
    }

    // Check if already processed
    if (user.hasReceivedSchemes) {
      console.log("Duplicate webhook. Already delivered.");
      return res.status(200).send("Already delivered");
    }

    // Immediately respond to Razorpay to prevent retries
    res.status(200).send("Webhook received");

    // Update user payment status
    user.paymentStatus = 'paid';
    user.razorpayPaymentId = payment.id;
    user.razorpayOrderId = payment.order_id;
    user.updatedAt = new Date();
    await user.save();

    console.log('✅ Payment verified and user updated for phone:', phone);

    // Referral logic - AFTER successful payment
    if (
      user.referredBy &&
      user.referredBy !== user.phone &&       // prevent self-referral
      !user.referralRewarded                 // prevent double-counting
    ) {
      const referrer = await getUserByPhone(user.referredBy);

      if (referrer) {
        referrer.referralCount = (referrer.referralCount || 0) + 1;

        // Check if 3-paid-referral set threshold is reached
        const totalSets = Math.floor(referrer.referralCount / 3);
        const paidSets = referrer.referralRewardedSets || 0;

        if (totalSets > paidSets) {
          await sendMessage(referrer.phone,
            `बधाई हो! आपके 3 referrals ने ₹49 भुगतान किया है। ₹60 cashback जल्द भेजा जाएगा।`);

          // Update paid sets count
          referrer.referralRewardedSets = totalSets;
        }

        await referrer.save();
        user.referralRewarded = true;
        await user.save();
      }
    }

    const eligibleSchemes = getEligibleSchemes(user.responses);
    const lang = user.language || '2';

    // Format message with proper line breaks and links
    let message;
    if (lang === '1') { // Hindi
      message = ` योजनाओं के नाम और उनके आवेदन लिंक:\n\n`;
      eligibleSchemes.forEach(scheme => {
        message += `📌 ${scheme.SchemeName}\n` +
                   ` आवेदन: ${scheme.OfficialLink || 'लिंक उपलब्ध नहीं'}\n` +
                   ` विधि: ${scheme.ApplicationMode}\n\n`;
      });
      message += `रसीद ID: ${payment.id}\n` +
                 `अपना स्कीम को चुनने के लिए धन्यवाद. `;
    } 
    else if (lang === '3') { // Marathi
      message = ` योजनांची नावे आणि अर्ज लिंक:\n\n`;
      eligibleSchemes.forEach(scheme => {
        message += `📌 ${scheme.SchemeName}\n` +
                   ` अर्ज: ${scheme.OfficialLink || 'लिंक उपलब्ध नाही'}\n` +
                   ` पद्धत: ${scheme.ApplicationMode}\n\n`;
      });
      message += `पावती ID: ${payment.id}\n` +
                 `अप्नास्कीम निवडल्याबद्दल धन्यवाद. `;
    } 
    else { // English (default)
      message = ` Scheme names with their application links:\n\n`;
      eligibleSchemes.forEach(scheme => {
        message += `📌 ${scheme.SchemeName}\n` +
                   ` Apply: ${scheme.OfficialLink || 'Link not available'}\n` +
                   ` Mode: ${scheme.ApplicationMode}\n\n`;
      });
      message += `Receipt ID: ${payment.id}\n` +
                 `Thank you for choosing ApnaScheme.`;
    }

    // Ensure message length is within WhatsApp limits
    if (message.length > 4096) {
      message = message.substring(0, 4000) + "...\n\n(Message truncated due to length)";
    }

    // Send the message
    await sendMessage(phone, message);
    console.log(`📩 Sent schemes to ${phone}`);

    // Mark as processed
    user.hasReceivedSchemes = true;
    await user.save();

    // Clean up
    delete userContext[phone];
  } catch (error) {
    console.error('Webhook error:', error);
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

    // Check if user exists in MongoDB
    let user = await User.findOne({ phone });

    if (!user) {
      // Check for referral parameter
      if (req.query.ref && req.query.ref !== phone) {
        user = new User({ 
          phone, 
          referredBy: req.query.ref,
          responses: [] 
        });
      } else {
        user = new User({ phone, responses: [] });
      }

      if (msg.includes('1')) {
        user.language = '1';
      } else if (msg.includes('2')) {
        user.language = '2';
      } else if (msg.includes('3')) {
        user.language = '3';
      } else {
        await sendMessage(phone, 
          "Namaste!\nMain hoon ApnaScheme - aapka Sarkari Saathi! 🇮🇳\n" +
          "Mere saath, pata karein\nKaunsi FREE government schemes aapke liye hai:\n" +
          "Bina agents\nBina Form\nBina Confusion\n\n"+
          "🗣️ Apni bhaasha chunein\n(Reply 1/2/3 to answer):\n" +
          "1. हिंदी\n2. English\n3. मराठी"
        );
        return res.sendStatus(200);
      }

      await user.save();
      userContext[phone] = user.toObject(); // Add to in-memory context
      const firstQuestion = getNextQuestion(userContext[phone]);
      await sendMessage(phone, firstQuestion);
      return res.sendStatus(200);
    }

    // Update user responses
    const qIndex = user.responses.length;
    const mapped = mapAnswer(parseInt(user.language), qIndex, msg);
    user.responses.push(mapped);
    user.updatedAt = new Date();

    // Save specific fields based on question index
    switch(qIndex) {
      case 0: user.gender = mapped; break;
      case 1: user.age = mapped; break;
      case 2: user.occupation = mapped; break;
      case 3: user.income = mapped; break;
      case 4: user.bankAccount = mapped; break;
      case 5: user.hasRation = mapped; break;
      case 6: user.state = mapped; break;
      case 7: user.caste = mapped; break;
    }

    await user.save();
    userContext[phone] = user.toObject(); // Update in-memory context

    const next = getNextQuestion(user);
    if (next) {
      await sendMessage(phone, next);
   } else {
  const paymentUrl = `${req.protocol}://${req.get('host')}/pay?phone=${phone}${user.referredBy ? `&ref=${user.referredBy}` : ''}`;
      const eligibleSchemes = getEligibleSchemes(user.responses);
      
      if (!user.referralCode) {
        user.referralCode = generateReferralCode(phone);
        await user.save();
      }

      let closingMessage = "";
      if (user.language === '1') {
        closingMessage = `रोमांचक खबर!\nआप ${eligibleSchemes.length} सरकारी योजनाओं के लिए पात्र हैं.\n\n` +
                      `केवल ₹49 में,\nतुरंत प्राप्त करें:\n` +
                      `योजनाओं की पूरी सूची\n` +
                      `आसान एक्सेस के लिए सीधे आवेदन लिंक\n\n` +
                      `तुरंत लाभ उठाएँ!\nसीमित समय ऑफर: \n${paymentUrl}\n\n` +
                      `अपने दोस्तों को भेजें और ₹60 कमाएं:\n` +
                      `https://wa.me/?text=मैंने%20ApnaScheme%20से%20${eligibleSchemes.length}%20योजनाएं%20प्राप्त%20की%20हैं!%20आप%20भी%20पाएं%20अपने%20लिए%20सरकारी%20योजनाएं:%20$wa.me/917977594397?text=Hi\n\n` +
                      `हर 3 दोस्तों के ₹49 भुगतान करने पर आपको ₹60 मिलेगा!`;
      } else if (user.language === '2') {
        closingMessage = `Exciting News!\nYou Qualify for ${eligibleSchemes.length} government schemes.\n\n` +
                      `For only ₹49,\ninstantly receive:\n` +
                      `List of all eligible schemes\n` +
                      `Direct application links\n\n` +
                      `Act Now!\nLimited-time offer: \n${paymentUrl}\n\n` +
                      `Refer friends & earn ₹60:\n` +
                      `https://wa.me/?text=I%20got%20${eligibleSchemes.length}%20government%20schemes%20from%20ApnaScheme!%20You%20can%20too:%20$wa.me/917977594397?text=Hi\n\n` +
                      `Earn ₹60 for every 3 friends who pay ₹49!`;
      } else {
        closingMessage = `आनंददायी बातमी!\nतुम्ही ${eligibleSchemes.length} सरकारी योजनांसाठी पात्र आहात.\n\n` +
                      `फक्त ₹49 मध्ये,\nताबडतोब मिळवा:\n` +
                      `योजनांची संपूर्ण यादी\n` +
                      `अर्जासाठी थेट लिंक\n\n` +
                      `लगेच अर्ज करा!\nमर्यादित वेळ ऑफर: \n${paymentUrl}\n\n` +
                      `मित्रांना पाठवा आणि ₹60 मिळवा:\n` +
                      `https://wa.me/?text=मी%20ApnaScheme%20मधून%20${eligibleSchemes.length}%20योजना%20मिळवल्या!%20तुम्ही%20ही%20मिळवा:%20$wa.me/917977594397?text=Hi\n\n` +
                      `प्रत्येक 3 मित्रांसाठी जे ₹49 भरतील तुम्हाला ₹60 मिळेल!`;
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
