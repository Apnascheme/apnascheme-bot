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

  const escapedPhone = phone.replace(/"/g, '\\"').replace(/'/g, "\\'");
  const razorpayKey = process.env.RAZORPAY_KEY_ID || '';

  const html = `
<!DOCTYPE html>
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
        <div class="price">One-time payment of ₹49</div>
        
        <div id="payment-status" class="payment-status">
            <div class="loader"></div>
            <p class="status-text pulse">Preparing payment gateway...</p>
        </div>
    </div>

    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <script>
        const phone = "${phone}";
        const paymentStatus = document.getElementById('payment-status');
        
        function updateStatus(text, isError = false) {
            const statusElement = document.createElement('p');
            statusElement.className = 'status-text ' + (isError ? 'error' : '');
            statusElement.textContent = text;
            
            paymentStatus.innerHTML = '';
            paymentStatus.appendChild(statusElement);
            
            if (isError) {
                const whatsappBtn = document.createElement('a');
                whatsappBtn.href = 'https://wa.me/917977594397' + phone;
                whatsappBtn.className = 'whatsapp-btn';
                whatsappBtn.textContent = 'Return to WhatsApp';
                paymentStatus.appendChild(whatsappBtn);
            }
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
        
        fetch('/order?phone=' + encodeURIComponent(phone))
          .then(res => res.json())
          .then(data => {
            clearInterval(textInterval);
            
            if (data.error) {
              updateStatus("Payment setup failed. Please try again.", true);
              return;
            }

            const options = {
              key: "${razorpayKey.replace(/"/g, '\\"')}",
              amount: data.amount,
              currency: data.currency,
              name: 'ApnaScheme',
              description: '₹1 Eligibility Plan',
              order_id: data.orderId,
              handler: function(response) {
                window.location.href = '/success?phone=' + encodeURIComponent(phone);
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
</html>
  `;
  res.send(html);
});

app.get('/success', (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).send('Phone number required');

  const phone = phone.replace(/"/g, '\\"').replace(/'/g, "\\'");

  res.send(`
<!DOCTYPE html>
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
        
        <a href="https://wa.me/${phone}" class="whatsapp-btn">
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
                
                confetti.style.transform = `rotate(${rotation}deg)`;
                confetti.style.animation = `confettiFall ${duration}s ease-out ${delay}s forwards`;
                
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

    // Format message with proper line breaks and links
    let message;
    if (lang === '1') { // Hindi
      message = `✅ भुगतान सफल!\n\nआप ${eligibleSchemes.length} योजनाओं के लिए पात्र हैं:\n\n`;
      eligibleSchemes.forEach(scheme => {
        message += `📌 ${scheme.SchemeName}\n` +
                   `🗓️ आवेदन: ${scheme.OfficialLink || 'लिंक उपलब्ध नहीं'}\n` +
                   `📋 विधि: ${scheme.ApplicationMode}\n\n`;
      });
      message += `📝 रसीद ID: ${payment.id}\n` +
                 `धन्यवाद!`;
    } 
    else if (lang === '3') { // Marathi
      message = `✅ पेमेंट यशस्वी!\n\nतुम्ही ${eligibleSchemes.length} योजनांसाठी पात्र आहात:\n\n`;
      eligibleSchemes.forEach(scheme => {
        message += `📌 ${scheme.SchemeName}\n` +
                   `🗓️ अर्ज: ${scheme.OfficialLink || 'लिंक उपलब्ध नाही'}\n` +
                   `📋 पद्धत: ${scheme.ApplicationMode}\n\n`;
      });
      message += `📝 पावती ID: ${payment.id}\n` +
                 `धन्यवाद!`;
    } 
    else { // English (default)
      message = `✅ Payment Successful!\n\nYou're eligible for ${eligibleSchemes.length} schemes:\n\n`;
      eligibleSchemes.forEach(scheme => {
        message += `📌 ${scheme.SchemeName}\n` +
                   `🗓️ Apply: ${scheme.OfficialLink || 'Link not available'}\n` +
                   `📋 Mode: ${scheme.ApplicationMode}\n\n`;
      });
      message += `📝 Receipt ID: ${payment.id}\n` +
                 `Thank you!`;
    }

    // Ensure message length is within WhatsApp limits
    if (message.length > 4096) {
      message = message.substring(0, 4000) + "...\n\n(Message truncated due to length)";
    }

    // Send the message
    await sendMessage(phone, message);
    console.log(`📩 Sent schemes to ${phone}`);

    // Clean up
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
