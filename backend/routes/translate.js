import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

const hindiDictionary = {
  'Butter Croissant': 'मक्खन क्रोइसैन (Butter Croissant)',
  'Whole Wheat Bread': 'साबुत गेहूं की ब्रेड (Whole Wheat Bread)',
  'Black Forest Cake': 'ब्लैक फॉरेस्ट केक (Black Forest Cake)',
  'Organic Milk 1L': 'जैविक दूध १ लीटर (Organic Milk 1L)',
  'Fresh Bananas 1 Doz': 'ताजा केले १ दर्जन (Fresh Bananas 1 Doz)',
  'Ergonomic Office Chair': 'आरामदायक ऑफिस चेयर (Ergonomic Office Chair)',
  'Study Table': 'पढ़ाई की मेज (Study Table)',
  'Assorted Cookies': 'मिश्रित कुकीज़ (Assorted Cookies)',
  
  // Categories
  'Bakery': 'बेकरी',
  'Dairy': 'डेयरी उत्पाद',
  'Produce': 'ताजी सब्जियां और फल',
  'Groceries': 'किराने का सामान',
  'Beverages': 'पेय पदार्थ',
  'Office Needs': 'दफ्तर का सामान',
  'Furniture': 'फर्नीचर',
  'Others': 'अन्य वस्तुएं',
};

// @desc    Translate product details (name and description) to Hindi
// @route   POST /api/translate
// @access  Public
router.post('/', async (req, res) => {
  const { name, description, category } = req.body;

  if (!name || !description) {
    return res.status(400).json({ message: 'Name and description are required for translation' });
  }

  try {
    // 1. Try Gemini Translation if API Key is configured
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
          You are a professional English to Hindi translator.
          Translate the following product information into conversational, easy-to-understand Hindi (using Devanagari script). Keep brand names or product types recognizable.
          
          Product Name: "${name}"
          Category: "${category || 'General'}"
          Description: "${description}"
          
          Respond only in valid JSON format matching this schema:
          {
            "translatedName": "translated name in Hindi",
            "translatedCategory": "translated category in Hindi",
            "translatedDescription": "translated description in Hindi"
          }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const parsedData = JSON.parse(jsonMatch[0]);
          return res.json(parsedData);
        }
      } catch (geminiError) {
        console.error('Gemini translation failed, using local dictionary:', geminiError.message);
      }
    }

    // 2. Local fallback dictionary and mapping translation
    const translatedName = hindiDictionary[name] || `${name} (डील)`;
    const translatedCategory = hindiDictionary[category] || category || 'अन्य';
    
    // Create a fallback description translation
    let translatedDescription = 'इस डील का हिंदी विवरण जल्द ही उपलब्ध होगा। कृपया दुकान से संपर्क करें।';
    
    if (description.includes('croissants')) {
      translatedDescription = 'ताजा पके हुए मक्खन क्रोइसैन्स। सुनहरे, परतदार और स्वादिष्ट। दिन के अंत में स्टॉक खत्म करने की डील, तुरंत खाने के लिए बेहतरीन!';
    } else if (description.includes('bread')) {
      translatedDescription = 'फाइबर से भरपूर साबुत गेहूं की ब्रेड। सैंडविच बनाने के लिए सर्वोत्तम। २ दिनों में उपभोग अवधि समाप्त हो जाएगी, कृपया ताजा खाएं।';
    } else if (description.includes('cake')) {
      translatedDescription = 'ताजा व्हीप्ड क्रीम और चेरी से बना स्वादिष्ट चॉकलेट केक। स्टॉक खाली करने के लिए विशेष छूट पर उपलब्ध!';
    } else if (description.includes('milk')) {
      translatedDescription = 'ताजा जैविक दूध। कैल्शियम से भरपूर। २ दिनों में उपयोग की तिथि समाप्त हो रही है। चाय, कॉफी या मीठे व्यंजनों के लिए उत्तम।';
    } else if (description.includes('bananas')) {
      translatedDescription = 'एक दर्जन पके हुए केले। मीठे और स्वादिष्ट। खाने या बनाना ब्रेड बनाने के लिए बिल्कुल तैयार।';
    } else if (description.includes('chair')) {
      translatedDescription = 'आरामदायक पीठ सपोर्ट वाली ऑफिस चेयर। शो-रूम में रखे होने के कारण हल्की खरोंचें हैं, लेकिन पूरी तरह मजबूत और काम करने योग्य है।';
    } else if (description.includes('table')) {
      translatedDescription = 'लकड़ी की सुंदर पढ़ाई की मेज। काफी समय से स्टोर में रखी थी, नया स्टॉक रखने के लिए कम कीमत पर बेची जा रही है।';
    } else if (description.includes('cookies')) {
      translatedDescription = 'ताजा पकी हुई स्वादिष्ट कुकीज़ का डिब्बा। अगले ३ दिनों में उपयोग कर लें।';
    }

    res.json({
      translatedName,
      translatedCategory,
      translatedDescription,
    });

  } catch (error) {
    console.error('Translation route error:', error);
    res.status(500).json({ message: 'Translation failed: ' + error.message });
  }
});

export default router;
