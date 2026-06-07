import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

// @desc    Translate texts or product details to Hindi
// @route   POST /api/translate
// @access  Public
router.post('/', async (req, res) => {
  const { name, description, category, q } = req.body;

  // If "q" is provided as an array, we handle batch translation of strings
  if (Array.isArray(q)) {
    if (q.length === 0) {
      return res.json({ translations: [] });
    }

    try {
      // 1. Try Google Translation API first
      const translateApiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GEMINI_API_KEY;
      if (translateApiKey && translateApiKey.trim() !== '') {
        try {
          const url = `https://translation.googleapis.com/language/translate/v2?key=${translateApiKey.trim()}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              q: q,
              target: 'hi',
              format: 'text'
            })
          });

          if (response.ok) {
            const data = await response.json();
            const translations = data.data?.translations;
            if (translations) {
              console.log(`[Translate API] Batch translated ${q.length} strings using Google Translation API`);
              return res.json({
                translations: translations.map(t => t.translatedText)
              });
            }
          } else {
            const errData = await response.json().catch(() => ({}));
            console.error('[Translate API] Google Translation API batch error status:', response.status, errData);
          }
        } catch (translateError) {
          console.error('[Translate API] Google Translation API batch request failed:', translateError.message);
        }
      }

      // 2. Try Gemini translation as batch fallback
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
        try {
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

          const prompt = `
            You are a professional English to Hindi translator.
            Translate the following array of strings into conversational, easy-to-understand Hindi (using Devanagari script). Keep brand names or product types recognizable.
            
            Input strings:
            ${JSON.stringify(q, null, 2)}
            
            Respond only in valid JSON format matching this schema:
            {
              "translations": ["translated string 1", "translated string 2", ...]
            }
            Ensure the array length matches the input array length exactly.
          `;

          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          const jsonMatch = text.match(/\{[\s\S]*\}/);

          if (jsonMatch) {
            const parsedData = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsedData.translations)) {
              console.log(`[Translate API] Batch translated ${q.length} strings using Gemini`);
              return res.json(parsedData);
            }
          }
        } catch (geminiError) {
          console.error('Gemini batch translation failed:', geminiError.message);
        }
      }

      // 3. Fallback: Return original strings
      console.log('[Translate API] Batch translation failed all APIs, returning original strings.');
      return res.json({ translations: q });

    } catch (error) {
      console.error('Batch translation endpoint error:', error);
      return res.status(500).json({ message: 'Translation failed: ' + error.message });
    }
  }

  // Single product translation handler (backward compatibility)
  if (!name || !description) {
    return res.status(400).json({ message: 'Name and description are required for translation' });
  }

  try {
    // 1. Try Google Translation API
    const translateApiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GEMINI_API_KEY;
    if (translateApiKey && translateApiKey.trim() !== '') {
      try {
        const url = `https://translation.googleapis.com/language/translate/v2?key=${translateApiKey.trim()}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: [name, category || '', description],
            target: 'hi',
            format: 'text'
          })
        });

        if (response.ok) {
          const data = await response.json();
          const translations = data.data?.translations;
          if (translations && translations.length >= 3) {
            console.log('[Translate API] Successfully translated using Google Translation API');
            return res.json({
              translatedName: translations[0].translatedText,
              translatedCategory: translations[1].translatedText || category,
              translatedDescription: translations[2].translatedText
            });
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          console.error('[Translate API] Google Translation API returned error status:', response.status, errData);
        }
      } catch (translateError) {
        console.error('[Translate API] Google Translation API request failed:', translateError.message);
      }
    }

    // 2. Try Gemini Translation
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
        console.error('Gemini translation failed:', geminiError.message);
      }
    }

    // 3. Fallback: Return original values
    console.log('[Translate API] Single translation failed all APIs, returning original values.');
    return res.json({
      translatedName: name,
      translatedCategory: category,
      translatedDescription: description
    });

  } catch (error) {
    console.error('Translation route error:', error);
    res.status(500).json({ message: 'Translation failed: ' + error.message });
  }
});

export default router;
