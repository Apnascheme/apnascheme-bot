import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import ExcelJS from 'exceljs';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BASE_URL = 'https://api.gupshup.io/sm/api/v1/msg';
const GUPSHUP_APP_TOKEN = process.env.GUPSHUP_APP_TOKEN;
const GUPSHUP_PHONE_NUMBER = process.env.GUPSHUP_PHONE_NUMBER;

const userContext = {}; // Temporary in-memory store
let schemes = []; // Store loaded schemes

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
    "तुमचं लिंग काय आहे?\n1.पुरुष\n2.महिला\n3.इतर",
    "तुमचं वय किती आहे? (उदाहरण: 18)",
    "तुम्ही काय करता?\n1. विद्यार्थी\n2. बेरोजगार\n3. नोकरी करता\n4. इतर",
    "पालकांचे वार्षिक उत्पन्न किती आहे? (उा: 120000)",
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
    0: { '1': 'पुरुष', '2': 'महिला', '3': 'इतर' },
    2: { '1': 'विद्यार्थी', '2': 'बेरोजगार', '3': 'नोकरी करता', '4': 'इतर' },
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

// Filter eligible schemes (updated version)
function getEligibleSchemes(userResponses) {
  const [gender, age, occupation, income, hasBank, hasRation, state, caste] = userResponses;

  return schemes.filter(scheme => {
    // 1. Basic active status check
    if (scheme.ActiveStatus !== 'Active') return false;

    // 2. Gender-specific scheme checks
    if (scheme.SchemeName.includes('Sukanya Samriddhi') && 
        !['female', 'महिला', 'स्त्री', 'woman', 'girl'].includes(gender.toLowerCase())) {
      return false;
    }

    // 3. Disability scheme checks
    if (scheme.SchemeName.includes('Disability') || 
        scheme.SchemeName.includes('Divyang') ||
        scheme.SchemeName.includes('Viklang')) {
      // Only show if user specifically indicated disability
      if (!occupation.toLowerCase().includes('disabled')) return false;
    }

    // 4. Occupation-specific checks
    if (scheme.EmploymentFilter && scheme.EmploymentFilter !== 'All') {
      const schemeOccupation = scheme.EmploymentFilter.toLowerCase();
      const userOccupation = occupation.toLowerCase();
      
      // Special cases
      if (schemeOccupation === 'farmer' && !userOccupation.includes('farmer')) return false;
      if (schemeOccupation === 'student' && !userOccupation.includes('student')) return false;
      if (schemeOccupation === 'unemployed' && !userOccupation.includes('unemployed')) return false;
    }

    // 5. State check
    const userState = state.toLowerCase().trim();
    const schemeState = scheme.TargetState.toLowerCase().trim();
    if (schemeState !== 'all india' && schemeState !== userState) return false;

    // 6. Age check
    const minAge = scheme.MinAge || 0;
    const maxAge = scheme.MaxAge || 100;
    if (age < minAge || age > maxAge) return false;

    // 7. Income check
    if (scheme.IncomeLimit && income > scheme.IncomeLimit) return false;

    // 8. Caste check
    if (scheme.CasteEligibility && scheme.CasteEligibility !== 'All') {
      const schemeCastes = scheme.CasteEligibility.split('/').map(c => c.trim().toLowerCase());
      const userCaste = caste.toLowerCase().trim();
      
      if (!schemeCastes.includes(userCaste)) {
        // Handle general category
        if (userCaste === 'general' && !schemeCastes.includes('general')) return false;
        if (userCaste === 'no' && !schemeCastes.includes('general')) return false;
      }
    }

    // 9. Bank account check
    if (scheme.BankAccountRequired) {
      const hasBankLower = hasBank.toLowerCase();
      if (!['हाँ', 'yes', 'होय', 'y', 'haan', 'हां'].includes(hasBankLower)) return false;
    }

    // 10. Aadhaar check
    if (scheme.AadhaarRequired) {
      const hasRationLower = hasRation.toLowerCase();
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
    const eligibleSchemes = getEligibleSchemes(user.responses);
    let schemeList = eligibleSchemes.slice(0, 5).map(s => `• ${s.SchemeName}`).join('\n');
    
    let closingMessage = "";
    if (user.language === '1') {
      closingMessage = `धन्यवाद! आप ${eligibleSchemes.length} योजनाओं के लिए पात्र हैं:\n\n${schemeList}\n\nपूरी सूची और आवेदन लिंक के लिए ₹49 का भुगतान करें:\nhttps://rzp.io/rzp/razorpay49`;
    } else if (user.language === '2') {
      closingMessage = `Thank you! You're eligible for ${eligibleSchemes.length} schemes:\n\n${schemeList}\n\nPay ₹49 for full list with application links:\nhttps://rzp.io/rzp/razorpay49`;
    } else if (user.language === '3') {
      closingMessage = `आभार! तुम्ही ${eligibleSchemes.length} योजनांसाठी पात्र आहात:\n\n${schemeList}\n\nसंपूर्ण यादीसाठी ₹49 भरा:\nhttps://rzp.io/rzp/razorpay49`;
    }

    await sendMessage(phone, closingMessage);
    delete userContext[phone];
  }

  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.send('✅ ApnaScheme Bot is running with scheme eligibility filtering');
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
