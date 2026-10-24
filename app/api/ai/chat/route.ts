import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

interface HealthTopic {
  patterns: string[]
  en: string
  hi: string
}

const TOPICS: HealthTopic[] = [
  {
    patterns: ['hello', 'hi', 'hey', 'greetings', 'namaste', 'नमस्ते', 'प्रणाम', 'हेलो', 'हाय', 'kaisa', 'kaise'],
    en: "Hello! I'm **Aarogya**, your personal clinical health assistant at Aarogya Darpan.\n\nHow can I help you today? You can ask me about:\n- 🩺 **Symptoms** (fever, headache, cough, stomach pain)\n- 💊 **Medications & Prescriptions**\n- 📅 **Booking Hospital Appointments**\n- 🧪 **Lab Investigation Reports**\n- 🥗 **Diet, Lifestyle & Mental Wellness**",
    hi: "नमस्ते! 🙏 मैं **आरोग्य** हूँ, आरोग्य दर्पण पर आपका व्यक्तिगत स्वास्थ्य सहायक।\n\nआज मैं आपकी क्या सहायता कर सकता हूँ? आप मुझसे पूछ सकते हैं:\n- 🩺 **लक्षणों के बारे में** (बुखार, सिरदर्द, खांसी, पेट दर्द)\n- 💊 **दवाएं और नुस्खे (Prescriptions)**\n- 📅 **अस्पताल में अपॉइंटमेंट बुक करना**\n- 🧪 **लैब टेस्ट और जांच रिपोर्ट**\n- 🥗 **खानपान, जीवनशैली और मानसिक स्वास्थ्य**",
  },
  {
    patterns: ['appointment', 'book', 'schedule', 'doctor', 'अपॉइंटमेंट', 'बुक', 'डॉक्टर', 'मिलना', 'ओपीडी'],
    en: "To schedule a doctor consultation, navigate to the **[Appointments](/dashboard/appointments)** section.\n\n**Steps to book:**\n1. Select your preferred hospital department or doctor.\n2. Choose an available date and time slot.\n3. Add a brief description of your visit reason and confirm.\n\nYou will receive immediate confirmation and SMS/email notifications.",
    hi: "डॉक्टर परामर्श बुक करने के लिए, अपने डैशबोर्ड में **[अपॉइंटमेंट्स (Appointments)](/dashboard/appointments)** पर जाएं।\n\n**बुक करने के आसान चरण:**\n1. अपने पसंदीदा विभाग या डॉक्टर का चयन करें।\n2. उपलब्ध तिथि और समय स्लॉट चुनें।\n3. अपने लक्षण या कारण दर्ज करें और पुष्टि करें।\n\nआपको तुरंत पुष्टिकरण और अधिसूचना प्राप्त होगी।",
  },
  {
    patterns: ['report', 'lab', 'test', 'investigation', 'blood test', 'रिपोर्ट', 'लैब', 'जांच', 'टेस्ट', 'ब्लड टेस्ट'],
    en: "Your diagnostic and laboratory reports are organized in the **[Lab Reports](/dashboard/labs)** section.\n\n- Reports show **Normal** vs **Abnormal / Flagged** parameters for fast review.\n- You can download official PDF copies with verified signatures.\n- Always discuss abnormal laboratory markers directly with your physician.",
    hi: "आपकी सभी डायग्नोस्टिक और पैथोलॉजी रिपोर्ट्स **[लैब रिपोर्ट्स (Lab Reports)](/dashboard/labs)** अनुभाग में सुरक्षित हैं।\n\n- रिपोर्ट में सामान्य और असामान्य मान स्पष्ट रूप से चिन्हित होते हैं।\n- आप डॉक्टर द्वारा हस्ताक्षरित डिजिटल PDF डाउनलोड कर सकते हैं।\n- किसी भी असामान्य परिणाम के लिए कृपया अपने डॉक्टर से परामर्श अवश्य लें।",
  },
  {
    patterns: ['prescription', 'medicine', 'medication', 'dose', 'drug', 'दवा', 'दवाई', 'औषधि', 'गोली', 'खुराक', 'नुस्खा'],
    en: "Access your active doctor prescriptions under **[Prescriptions](/dashboard/prescriptions)**.\n\n**Safe Medication Guidelines:**\n- Take medicines strictly according to dosage timing (before/after meals).\n- Complete antibiotic courses without premature discontinuation.\n- Do not combine over-the-counter medicines without checking for contraindications.",
    hi: "अपनी सक्रिय दवाओं और पर्चे देखने के लिए **[प्रिस्क्रिप्शन (Prescriptions)](/dashboard/prescriptions)** पर जाएं।\n\n**दवा सुरक्षा नियम:**\n- डॉक्टर के निर्देशानुसार समय पर दवा लें (भोजन से पहले या बाद में)।\n- एंटीबायोटिक का कोर्स कभी बीच में अधूरा न छोड़ें।\n- बिना डॉक्टर की सलाह के कोई भी नई दवा या खुराक में बदलाव न करें।",
  },
  {
    patterns: ['headache', 'migraine', 'head ache', 'सिर दर्द', 'सर दर्द', 'माइग्रेन', 'सिरदर्द'],
    en: "**Tips for Headache Relief:**\n- **Hydration:** Drink 2–3 glasses of clean water immediately.\n- **Rest:** Lie down in a cool, dimly lit, quiet room for 20–30 minutes.\n- **Reduce Screen Strain:** Take regular breaks from mobile/laptop screens.\n- **Cold Compress:** Apply an ice pack wrapped in a cloth to your forehead or neck.\n\n*⚠️ Warning: Seek immediate emergency medical care if you experience a sudden thunderclap headache, stiff neck, high fever, or vision loss.*",
    hi: "**सिरदर्द से राहत पाने के घरेलू और प्राथमिक उपाय:**\n- **पर्याप्त पानी पिएं:** निर्जलीकरण (Dehydration) सिरदर्द का मुख्य कारण हो सकता है, तुरंत 2-3 गिलास पानी पिएं।\n- **आराम करें:** शांत और मंद रोशनी वाले कमरे में 20-30 मिनट आंखें बंद करके लेटें।\n- **स्क्रीन से दूरी बनाएं:** मोबाइल और कंप्यूटर स्क्रीन से तुरंत ब्रेक लें।\n- **ठंडी सिकाई:** माथे या गर्दन के पीछे ठंडे पानी की पट्टी या आइस पैक रखें।\n\n*⚠️ चेतावनी: यदि सिरदर्द अचानक बहुत तेज हो, साथ में उल्टी, गर्दन में अकड़न या चक्कर आएं, तो तुरंत आपातकालीन कक्ष या डॉक्टर से संपर्क करें।*",
  },
  {
    patterns: ['fever', 'cold', 'cough', 'flu', 'temperature', 'बुखार', 'सर्दी', 'जुकाम', 'खांसी', 'तापमान', 'वायरल'],
    en: "**Managing Fever, Cold & Cough:**\n- **Hydration:** Drink warm water, herbal teas, or clear broths throughout the day.\n- **Rest:** Allow your immune system time to recover with 8+ hours of sleep.\n- **Monitor Temperature:** Keep a temperature log every 4–6 hours.\n- **Steam Inhalation:** Inhaling warm steam can relieve nasal and chest congestion.\n- **Consult Physician:** If fever exceeds 102°F (38.9°C) or lasts over 3 days, visit a doctor.",
    hi: "**बुखार, सर्दी और खांसी प्रबंधन:**\n- **तरल पदार्थ लें:** गुनगुना पानी, हर्बल चाय, काढ़ा या सूप का नियमित सेवन करें।\n- **पर्याप्त आराम:** शरीर की रोग प्रतिरोधक क्षमता को ठीक होने के लिए कम से कम 8 घंटे की नींद लें।\n- **तापमान मापें:** हर 4 से 6 घंटे में थर्मामीटर से बुखार नोट करें।\n- **भाप (Steam) लें:** नाक बंद होने और गले की खराश से राहत के लिए दिन में 2 बार भाप लें।\n- **डॉक्टर को दिखाएं:** यदि बुखार 102°F से अधिक हो या 3 दिन से ज्यादा रहे, तो तुरंत डॉक्टर से मिलें।",
  },
  {
    patterns: ['blood pressure', 'bp', 'hypertension', 'रक्तचाप', 'बीपी', 'हाई बीपी', 'लो बीपी', 'हाइपरटेंशन'],
    en: "**Blood Pressure Health Guide:**\n- **Normal Range:** Generally under 120/80 mmHg at rest.\n- **Dietary Sodium:** Limit salt intake to less than 1 teaspoon (5 grams) per day.\n- **DASH Diet:** Eat plenty of potassium-rich foods (bananas, spinach, oats, lentils).\n- **Daily Exercise:** Engage in 30 minutes of brisk walking or cardio.\n- **Stress Management:** Practice diaphragmatic deep breathing for 10 minutes daily.",
    hi: "**रक्तचाप (Blood Pressure) नियंत्रण मार्गदर्शिका:**\n- **सामान्य सीमा:** सामान्यतः आराम की स्थिति में 120/80 mmHg से कम।\n- **नमक कम करें:** दैनिक भोजन में नमक की मात्रा 1 चम्मच (5 ग्राम) से कम रखें।\n- **पोषक आहार:** पोटैशियम युक्त खाद्य पदार्थ (केला, पालक, ओट्स, दालें) खाएं।\n- **दैनिक व्यायाम:** रोजाना 30 मिनट तेज गति से पैदल चलें या योग करें।\n- **तनाव मुक्ति:** दिन में 10 मिनट गहरी सांस लेने (प्राणायाम) का अभ्यास करें।",
  },
  {
    patterns: ['diabetes', 'sugar', 'glucose', 'hba1c', 'डायबिटीज', 'मधुमेह', 'शुगर', 'ग्लूकोज'],
    en: "**Diabetes & Blood Glucose Management:**\n- **Low Glycemic Index:** Choose whole grains, legumes, non-starchy vegetables, and lean protein.\n- **Avoid Refined Sugars:** Strictly cut down on sugary drinks, packaged juices, and refined carbs.\n- **Regular Monitoring:** Track fasting blood sugar (target 70–100 mg/dL) and post-meal sugar (<140 mg/dL).\n- **Quarterly HbA1c:** Test HbA1c every 3 months to monitor long-term control.",
    hi: "**डायबिटीज और ब्लड शुगर प्रबंधन:**\n- **कम ग्लाइसेमिक भोजन:** साबुत अनाज, दालें, हरी सब्जियां और फाइबर युक्त भोजन शामिल करें।\n- **मीठा और रिफाइंड कार्ब्स बंद करें:** कोल्ड ड्रिंक्स, पैकेज्ड जूस और अधिक तेल-मसाले से बचें।\n- **नियमित जांच:** खाली पेट शुगर (लक्ष्य 70–100 mg/dL) और खाने के 2 घंटे बाद (<140 mg/dL) मापें।\n- **HbA1c जांच:** हर 3 महीने में HbA1c टेस्ट करवाएं ताकि दीर्घकालिक नियंत्रण बना रहे।",
  },
  {
    patterns: ['stomach', 'abdomen', 'acidity', 'gas', 'digest', 'constipation', 'पेट दर्द', 'गैस', 'एसिडिटी', 'अपच', 'कब्ज'],
    en: "**Digestive Health & Acidity Relief:**\n- **Hydration & Fiber:** Increase intake of soluble fiber (psyllium husk, flaxseed, leafy greens).\n- **Avoid Trigger Foods:** Minimize oily, spicy foods, caffeine, and carbonated beverages.\n- **Meal Timing:** Eat smaller, frequent meals and avoid lying down for 2 hours post-meal.\n- **Probiotics:** Consume fresh plain curd/yogurt to support healthy gut microbiota.",
    hi: "**पेट दर्द, गैस और एसिडिटी के उपाय:**\n- **हल्का और सुपाच्य भोजन:** फाइबर युक्त आहार (दलिया, हरी सब्जियां, फल) लें।\n- **मसालेदार भोजन से परहेज:** अधिक तीखा, तला-भुना और चाय-कॉफी का सेवन कम करें।\n- **भोजन का समय:** भोजन करने के तुरंत बाद न सोएं, कम से कम 2 घंटे बाद बिस्तर पर जाएं।\n- **दही और छाछ:** पेट के अच्छे बैक्टीरिया के लिए ताजी दही या छाछ का सेवन लाभकारी है।",
  },
  {
    patterns: ['diet', 'nutrition', 'food', 'weight loss', 'calories', 'खानपान', 'डाइट', 'आहार', 'भोजन', 'वजन कम', 'पोषण'],
    en: "**Balanced Nutrition Principles:**\n- Fill half your plate with colorful vegetables and raw salads.\n- Include quality protein (pulses, paneer, tofu, fish, or chicken) in each major meal.\n- Replace refined white flour and white sugar with unpolished millets (ragi, bajra, jowar).\n- Drink 2.5–3 liters of water daily to maintain metabolic equilibrium.",
    hi: "**संतुलित और पौष्टिक आहार के नियम:**\n- अपनी थाली का आधा हिस्सा हरी सब्जियों और ताजे सलाद से भरें।\n- प्रत्येक भोजन में प्रोटीन (दालें, पनीर, सोया, अंडा या मछली) अवश्य शामिल करें।\n- मैदा और सफेद चीनी की जगह मोटे अनाज (रागी, बाजरा, ज्वार, जई) अपनाएं।\n- शरीर की मेटाबॉलिज्म गति बनाए रखने के लिए रोजाना 2.5 से 3 लीटर पानी पिएं।",
  },
  {
    patterns: ['sleep', 'insomnia', 'rest', 'नींद', 'सोना', 'अनिद्रा', 'रात को नींद'],
    en: "**Sleep Hygiene Recommendations:**\n- Maintain a fixed sleep schedule, waking up and sleeping at the exact same hour daily.\n- Disconnect from digital devices (smartphones, TVs, laptops) at least 60 minutes before bed.\n- Keep your bedroom dark, quiet, and temperature around 20–22°C (68–72°F).\n- Avoid caffeine, heavy meals, and vigorous workouts late in the evening.",
    hi: "**गहरी और स्वस्थ नींद के लिए सुझाव:**\n- प्रतिदिन सोने और जागने का एक निश्चित समय निर्धारित करें।\n- सोने से कम से कम 1 घंटा पहले मोबाइल फोन, टीवी और लैपटॉप बंद कर दें।\n- शयनकक्ष को शांत, अंधेरा और आरामदायक रखें।\n- रात को सोने से पहले भारी भोजन और चाय-कॉफी से पूरी तरह बचें।",
  },
  {
    patterns: ['stress', 'anxiety', 'mental health', 'depression', 'तनाव', 'चिंता', 'डिप्रेशन', 'मानसिक', 'घबराहट'],
    en: "**Mental Wellness & Stress Relief:**\n- **4-7-8 Breathing:** Inhale quietly for 4 seconds, hold for 7 seconds, exhale slowly for 8 seconds.\n- **Physical Movement:** A 20-minute outdoor walk boosts dopamine and reduces cortisol levels.\n- **Talk it Out:** Reach out to trusted family members, friends, or a professional mental health counselor.\n- If symptoms persist or feel overwhelming, booking a consultation with our hospital psychologist is recommended.",
    hi: "**तनाव और मानसिक शांति के उपाय:**\n- **गहरी श्वास तकनीक (4-7-8):** 4 सेकंड सांस अंदर लें, 7 सेकंड रोकें, और 8 सेकंड में धीरे-धीरे बाहर छोड़ें।\n- **नियमित टहलना:** ताजी हवा में 20 मिनट की सैर दिमाग को शांत करती है और तनाव दूर करती है।\n- **बातचीत करें:** अपनी भावनाएं अपने करीबी दोस्तों, परिवार या विशेषज्ञ काउंसलर के साथ साझा करें।\n- यदि घबराहट या उदासी बनी रहे, तो हमारे अस्पताल के मनोवैज्ञानिक से परामर्श लें।",
  },
  {
    patterns: ['emergency', 'urgent', 'chest pain', 'heart attack', 'stroke', 'इमरजेंसी', 'आपातकाल', 'सीने में दर्द', 'दौरा', 'बेहोश'],
    en: "**🚨 MEDICAL EMERGENCY ALERT:**\nIf you or someone nearby is experiencing:\n- Severe crushing chest pain or pressure\n- Sudden numbness/weakness in face, arm, or leg\n- Difficulty speaking or sudden confusion\n- Severe breathing distress or uncontrolled bleeding\n\n**Action:** Please immediately call your national emergency helpline (**112 / 102 in India**) or rush to the nearest hospital Emergency Department. Do not delay.",
    hi: "**🚨 आपातकालीन चिकित्सा चेतावनी:**\nयदि आपको या आपके किसी परिजन को:\n- सीने में तेज दबाव या असहनीय दर्द हो\n- चेहरे, हाथ या पैर में अचानक सुन्नता/कमजोरी आए\n- बोलने में कठिनाई या अचानक चक्कर और बेहोशी आए\n- सांस लेने में अत्यधिक तकलीफ या अनियंत्रित रक्तस्राव हो\n\n**तत्काल कदम:** तुरंत राष्ट्रीय आपातकालीन नंबर (**112 या 102**) पर कॉल करें या निकटतम अस्पताल की इमरजेंसी में जाएं। बिल्कुल भी देर न करें।",
  },
]

function getRuleBasedResponse(message: string, isHindi: boolean): string {
  const lower = message.toLowerCase()

  for (const topic of TOPICS) {
    if (topic.patterns.some(p => lower.includes(p.toLowerCase()))) {
      return isHindi ? topic.hi : topic.en
    }
  }

  if (isHindi) {
    return "मैं स्वास्थ्य संबंधी प्रश्नों, लक्षणों, दवाओं, अपॉइंटमेंट और आपकी लैब रिपोर्ट्स को समझने में आपकी मदद कर सकता हूँ। क्या आप अपनी समस्या के बारे में थोड़ा और विस्तार से बता सकते हैं?\n\n*नोट: किसी भी गंभीर आपातकालीन स्थिति में तुरंत निकटतम अस्पताल की इमरजेंसी में जाएं या 112 पर संपर्क करें।*"
  }

  return "I'm here to help you navigate your health concerns, understand symptoms, manage medication schedules, or guide you through your hospital dashboard. Could you tell me a bit more about what you're experiencing?\n\n*Note: For acute medical emergencies, please immediately visit the nearest emergency department or call your local emergency hotline (112).* "
}

export async function POST(req: NextRequest) {
  try {
    const { message, history, language = 'en' } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    const trimmed = message.trim()
    const containsHindiChars = /[\u0900-\u097F]/.test(trimmed)
    const isHindi = language === 'hi' || containsHindiChars

    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey && apiKey !== 'your-openai-api-key') {
      try {
        const openai = new OpenAI({ apiKey })

        const targetLang = isHindi ? 'Hindi (हिन्दी)' : 'English'
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          {
            role: 'system',
            content: `You are Aarogya, the clinical AI Health Assistant for Aarogya Darpan — a modern digital hospital and health management system.
Your mission is to provide accurate, empathetic, and clear healthcare guidance to patients and medical staff.

LANGUAGE DIRECTIVE:
The user language is ${targetLang}.
${isHindi ? 'You MUST formulate your response in fluent, natural Hindi (हिन्दी) using clean Devanagari script, warm empathy, and easily understood healthcare terminology. Do not output English unless writing medical brand names or terms.' : 'Formulate your response in clear, professional, empathetic English.'}

CLINICAL & SAFETY RULES:
1. Provide structured medical information, practical lifestyle advice, symptom explanations, and triage recommendations.
2. Emphasize when symptoms warrant seeing a doctor, visiting the emergency room, or booking an appointment in the dashboard (/dashboard/appointments).
3. Do not formulate definitive clinical diagnoses or prescribe prescription drugs; recommend consulting a licensed physician.
4. Format responses cleanly using Markdown:
   - Use **bold** text for key medical terms and actionable tips.
   - Use bullet points (- or *) for lists and numbered steps for processes.
   - Format links cleanly as [Link Text](/dashboard/...).
5. If the user asks about system features, guide them to the appropriate dashboard section (Appointments, Prescriptions, Lab Reports, Family Members, Billing).
6. Always end with or include a brief note recommending clinical consultation for serious symptoms.`,
          },
          ...(Array.isArray(history)
            ? history.slice(-8).map((m: any) => ({
                role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
                content: String(m.content || ''),
              }))
            : []),
          { role: 'user', content: trimmed },
        ]

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 700,
          temperature: 0.7,
        })

        const reply = response.choices?.[0]?.message?.content
        if (reply) {
          return NextResponse.json({ response: reply, source: 'openai' })
        }
      } catch (aiError: any) {
        console.error('[OpenAI Chat API Error]:', aiError?.message || aiError)
        // Fall through to enhanced bilingual rule-based engine
      }
    }

    const ruleResponse = getRuleBasedResponse(trimmed, isHindi)
    return NextResponse.json({ response: ruleResponse, source: 'rule-based' })
  } catch (error: any) {
    console.error('[Chat API Error]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
