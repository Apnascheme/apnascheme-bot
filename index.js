{
  "version": "1.0",
  "description": "ApnaScheme WhatsApp Bot flow (English, Hindi, Marathi) – plug into Gupshup API Bot Builder",
  "defaultLanguage": "en",
  "states": {
    "start": {
      "type": "message",
      "text": {
        "en": "Namaste! Main hoon ApnaScheme – your digital dost 🇮🇳\nI will tell you which Government Schemes you are eligible for – no agent, no form, no confusion.\n\n🗣️ Please select your language:\n1️⃣ हिंदी\n2️⃣ English\n3️⃣ मराठी",
        "hi": "नमस्ते! मैं हूँ ApnaScheme – आपका डिजिटल दोस्त 🇮🇳\nमैं आपको बताऊँगा कि कौन-कौन सी सरकारी योजनाएँ आपके लिए हैं – बिना एजेंट, बिना फ़ॉर्म, बिना कन्फ्यूजन।\n\n🗣️ कृपया अपनी भाषा चुनें:\n1️⃣ हिंदी\n2️⃣ English\n3️⃣ मराठी",
        "mr": "नमस्कार! मी आहे ApnaScheme – तुमचा डिजिटल दोस्त 🇮🇳\nमी तुम्हाला सांगेन की कोणत्या शासकीय योजना तुमच्यासाठी आहेत – एजंटशिवाय, फॉर्मशिवाय, गोंधळाशिवाय.\n\n🗣️ कृपया तुमची भाषा निवडा:\n1️⃣ हिंदी\n2️⃣ English\n3️⃣ मराठी"
      },
      "next": "set_language"
    },
    "set_language": {
      "type": "input",
      "variable": "lang_choice",
      "validation": {
        "type": "regex",
        "value": "^[1-3]$"
      },
      "next": {
        "1": {
          "goto": "ask_gender",
          "language": "hi"
        },
        "2": {
          "goto": "ask_gender",
          "language": "en"
        },
        "3": {
          "goto": "ask_gender",
          "language": "mr"
        }
      }
    },
    "ask_gender": {
      "type": "choice",
      "question": {
        "en": "What is your gender?\n1️⃣ Male\n2️⃣ Female\n3️⃣ Widow\n4️⃣ PwD",
        "hi": "आपका जेंडर क्या है?\n1️⃣ पुरुष\n2️⃣ महिला\n3️⃣ विधवा\n4️⃣ विकलांग",
        "mr": "तुमचे लिंग काय आहे?\n1️⃣ पुरुष\n2️⃣ महिला\n3️⃣ विधवा\n4️⃣ दिव्यांग"
      },
      "variable": "gender",
      "options": [
        "1",
        "2",
        "3",
        "4"
      ],
      "next": "ask_age"
    },
    "ask_age": {
      "type": "input",
      "question": {
        "en": "Please enter your age (in years):",
        "hi": "कृपया अपनी आयु (वर्षों में) दर्ज करें:",
        "mr": "कृपया तुमचे वय (वर्षांत) लिहा:"
      },
      "variable": "age",
      "validation": {
        "type": "number",
        "min": 1,
        "max": 120
      },
      "next": "ask_state"
    },
    "ask_state": {
      "type": "input",
      "question": {
        "en": "Which State are you from? (e.g., Maharashtra)",
        "hi": "आप किस राज्य से हैं? (जैसे, महाराष्ट्र)",
        "mr": "तुम्ही कोणत्या राज्यातून आहात? (उदा., महाराष्ट्र)"
      },
      "variable": "state",
      "next": "ask_category"
    },
    "ask_category": {
      "type": "choice",
      "question": {
        "en": "Do you belong to SC/ST/OBC/EWS category?\n1️⃣ Yes\n2️⃣ No",
        "hi": "क्या आप SC/ST/OBC/EWS श्रेणी से हैं?\n1️⃣ हाँ\n2️⃣ नहीं",
        "mr": "तुम्ही SC/ST/OBC/EWS प्रवर्गात येता का?\n1️⃣ हो\n2️⃣ नाही"
      },
      "variable": "category",
      "options": [
        "1",
        "2"
      ],
      "next": "ask_occupation"
    },
    "ask_occupation": {
      "type": "choice",
      "question": {
        "en": "What is your current occupation?\n1️⃣ Student\n2️⃣ Unemployed\n3️⃣ Employed\n4️⃣ Self-employed\n5️⃣ Farmer\n6️⃣ Labourer",
        "hi": "आपका वर्तमान पेशा क्या है?\n1️⃣ छात्र\n2️⃣ बेरोज़गार\n3️⃣ नौकरीपेशा\n4️⃣ स्व-रोज़गार\n5️⃣ किसान\n6️⃣ मजदूर",
        "mr": "तुमचे सध्याचे व्यावसायिक स्थिती काय आहे?\n1️⃣ विद्यार्थी\n2️⃣ बेरोजगार\n3️⃣ नोकरदार\n4️⃣ स्व-रोजगार\n5️⃣ शेतकरी\n6️⃣ कामगार"
      },
      "variable": "occupation",
      "options": [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6"
      ],
      "next": {
        "1": "ask_guardian_income",
        "2": "ask_guardian_income",
        "default": "ask_income"
      }
    },
    "ask_income": {
      "type": "input",
      "question": {
        "en": "What is your annual household income (INR)?",
        "hi": "आपकी वार्षिक पारिवारिक आय (₹ में) क्या है?",
        "mr": "तुमचे वार्षिक कुटुंब उत्पन्न (₹) किती आहे?"
      },
      "variable": "income",
      "validation": {
        "type": "number",
        "min": 0
      },
      "next": "check_bank_skip"
    },
    "ask_guardian_income": {
      "type": "input",
      "question": {
        "en": "What is your guardian's annual income (INR)?",
        "hi": "आपके अभिभावक की वार्षिक आय (₹ में) क्या है?",
        "mr": "तुमच्या पालकांचे वार्षिक उत्पन्न (₹) किती आहे?"
      },
      "variable": "income",
      "validation": {
        "type": "number",
        "min": 0
      },
      "next": "check_bank_skip"
    },
    "check_bank_skip": {
      "type": "decision",
      "condition": "${age} < 18",
      "true": "ask_ration",
      "false": "ask_bank"
    },
    "ask_bank": {
      "type": "choice",
      "question": {
        "en": "Do you have a bank account?\n1️⃣ Yes\n2️⃣ No",
        "hi": "क्या आपका बैंक खाता है?\n1️⃣ हाँ\n2️⃣ नहीं",
        "mr": "तुमचे बँक खाते आहे का?\n1️⃣ हो\n2️⃣ नाही"
      },
      "variable": "bank",
      "options": [
        "1",
        "2"
      ],
      "next": "ask_ration"
    },
    "ask_ration": {
      "type": "choice",
      "question": {
        "en": "Do you have a ration card?\n1️⃣ Yes\n2️⃣ No",
        "hi": "क्या आपके पास राशन कार्ड है?\n1️⃣ हाँ\n2️⃣ नहीं",
        "mr": "तुमच्याकडे रेशन कार्ड आहे का?\n1️⃣ हो\n2️⃣ नाही"
      },
      "variable": "ration",
      "options": [
        "1",
        "2"
      ],
      "next": "ask_existing_scheme"
    },
    "ask_existing_scheme": {
      "type": "choice",
      "question": {
        "en": "Are you already benefiting from any government scheme?\n1️⃣ Yes\n2️⃣ No",
        "hi": "क्या आप किसी सरकारी योजना का लाभ पहले से ले रहे हैं?\n1️⃣ हाँ\n2️⃣ नहीं",
        "mr": "तुम्ही आधीच कोणत्याही शासकीय योजनेचा लाभ घेत आहात का?\n1️⃣ हो\n2️⃣ नाही"
      },
      "variable": "existing_scheme",
      "options": [
        "1",
        "2"
      ],
      "next": "show_eligibility"
    },
    "show_eligibility": {
      "type": "message",
      "text": {
        "en": "Based on your answers:\n\n🎯 You may be eligible for 4 Government Schemes:\n- 2 Women Schemes\n- 1 Student Scheme\n- 1 Health Scheme\n\n✅ Want full scheme names, PDF and guidance?\nThis complete help costs only ₹49 (one‑time).",
        "hi": "आपके जवाबों के अनुसार:\n\n🎯 आप 4 सरकारी योजनाओं के लिए पात्र हो सकते हैं:\n- 2 महिला योजना\n- 1 छात्र योजना\n- 1 स्वास्थ्य योजना\n\n✅ योजनाओं के नाम, PDF और पूरी जानकारी चाहिए?\nसिर्फ ₹49 एक बार।",
        "mr": "तुमच्या उत्तरांनुसार:\n\n🎯 तुम्ही 4 शासकीय योजनांसाठी पात्र असू शकता:\n- 2 महिला योजना\n- 1 विद्यार्थी योजना\n- 1 आरोग्य योजना\n\n✅ संपूर्ण नाव, PDF व मार्गदर्शन हवे?\nफक्त ₹49 एकदाच."
      },
      "next": "payment_warning"
    },
    "payment_warning": {
      "type": "message",
      "text": {
        "en": "Please note: ₹49 is a one‑time charge for full scheme list, PDF and guidance.\nThis amount is *non‑refundable*.",
        "hi": "कृपया ध्यान दें: ₹49 एक बार का शुल्क है जिसमें योजनाओं की सूची, PDF और मार्गदर्शन मिलेगा।\nयह राशि *अवापसी योग्य नहीं है*.",
        "mr": "कृपया लक्षात घ्या: ₹49 हा एकदाच भरणा आहे ज्यामध्ये योजना सूची, PDF आणि मार्गदर्शन समाविष्ट आहे.\nही रक्कम *परत केली जाणार नाही*."
      },
      "next": "send_payment_link"
    },
    "send_payment_link": {
      "type": "message",
      "text": {
        "en": "🔒 To activate your ₹49 Yojana Assist plan, pay here:\n{RAZORPAY_LINK_EN}",
        "hi": "🔒 अपना ₹49 योजना असिस्ट प्लान चालू करने के लिए यहाँ भुगतान करें:\n{RAZORPAY_LINK_HI}",
        "mr": "🔒 तुमचा ₹49 योजना असिस्ट प्लॅन सक्रिय करण्यासाठी इथे पेमेंट करा:\n{RAZORPAY_LINK_MR}"
      },
      "next": "wait_payment"
    },
    "wait_payment": {
      "type": "event",
      "event": "payment_success",
      "next": "post_payment"
    },
    "post_payment": {
      "type": "message",
      "text": {
        "en": "✅ Payment received!\n🎉 Congratulations! You are eligible for 4 schemes.\n📄 [Download PDF]\nNeed any help applying? Just ask here.\n\n📢 Share with friends:\n👉 wa.me/91XXXXXXXXXX?text=Hi",
        "hi": "✅ भुगतान सफल!\n🎉 बधाई हो! आप 4 योजनाओं के पात्र हैं।\n📄 [PDF डाउनलोड करें]\nआवेदन में मदद चाहिए? यहीं पूछें।\n\n📢 दोस्तों से शेयर करें:\n👉 wa.me/91XXXXXXXXXX?text=Hi",
        "mr": "✅ पेमेंट यशस्वी!\n🎉 अभिनंदन! तुम्ही 4 योजना पात्र आहात.\n📄 [PDF डाउनलोड करा]\nअर्ज करताना मदत हवी? इथेच विचारा.\n\n📢 मित्रांना शेअर करा:\n👉 wa.me/91XXXXXXXXXX?text=Hi"
      },
      "next": "end"
    },
    "end": {
      "type": "end"
    }
  }
}
