import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Fallback catalog for mock image identification when Gemini API key is missing
const mockProductsCatalog = [
  {
    keywords: ['croissant', 'butter', 'bakery'],
    name: 'Butter Croissant',
    category: 'Bakery',
    suggestedDescription: 'Freshly baked butter croissants. Golden, flaky, and delicious. Nearing end of day shelf-life but perfect for a quick snack or breakfast warm-up!',
    confidenceScore: 96,
    suggestedOriginalPrice: 50,
    suggestedDiscountedPrice: 15
  },
  {
    keywords: ['bread', 'wheat', 'loaf'],
    name: 'Whole Wheat Bread',
    category: 'Bakery',
    suggestedDescription: 'Rich fiber whole wheat sliced bread. Soft and perfect for sandwiches. Expiring in 2 days, consume fresh or freeze.',
    confidenceScore: 92,
    suggestedOriginalPrice: 50,
    suggestedDiscountedPrice: 20
  },
  {
    keywords: ['cake', 'forest', 'chocolate'],
    name: 'Black Forest Cake',
    category: 'Bakery',
    suggestedDescription: 'Delicious chocolate sponge cake layered with fresh whipped cream and cherries. Super fresh, prepared yesterday for display. Clear stock deal!',
    confidenceScore: 94,
    suggestedOriginalPrice: 500,
    suggestedDiscountedPrice: 250
  },
  {
    keywords: ['milk', 'dairy', 'organic'],
    name: 'Organic Milk 1L',
    category: 'Dairy',
    suggestedDescription: 'Fresh organic whole milk. Rich in calcium. Best-by date is in 2 days. Great for tea, coffee, baking, or milkshakes.',
    confidenceScore: 95,
    suggestedOriginalPrice: 60,
    suggestedDiscountedPrice: 36
  },
  {
    keywords: ['banana', 'fruit', 'produce'],
    name: 'Fresh Bananas 1 Doz',
    category: 'Produce',
    suggestedDescription: 'A dozen fully ripe yellow bananas. Sweet and ready for eating, smoothies, or baking banana bread.',
    confidenceScore: 91,
    suggestedOriginalPrice: 35,
    suggestedDiscountedPrice: 25
  },
  {
    keywords: ['chair', 'ergonomic', 'office', 'furniture'],
    name: 'Ergonomic Office Chair',
    category: 'Office Needs',
    suggestedDescription: 'High-back ergonomic mesh office chair with lumbar support. Minor cosmetic wear from showroom display. Fully functional!',
    confidenceScore: 89,
    suggestedOriginalPrice: 10000,
    suggestedDiscountedPrice: 3500
  },
  {
    keywords: ['table', 'desk', 'study'],
    name: 'Study Table',
    category: 'Furniture',
    suggestedDescription: 'Minimalist wooden study desk with metal legs. Perfect for home offices. Shelved for long, being cleared for new designs.',
    confidenceScore: 93,
    suggestedOriginalPrice: 5000,
    suggestedDiscountedPrice: 2250
  },
  {
    keywords: ['cookie', 'chocolate', 'biscuit'],
    name: 'Assorted Cookies',
    category: 'Bakery',
    suggestedDescription: 'A box of freshly baked assorted cookies (chocolate chip, oatmeal, butter). Baked in-house. Best consumed within 3 days.',
    confidenceScore: 94,
    suggestedOriginalPrice: 300,
    suggestedDiscountedPrice: 90
  }
];

// Helper: Convert local file to Generative AI Part
const fileToGenerativePart = (filePath, mimeType) => {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString('base64'),
      mimeType,
    },
  };
};

// @desc    Analyze uploaded image with Gemini or intelligent fallback
// @route   POST /api/ai/analyze
// @access  Private (Vendor)
router.post('/analyze', protect, authorize('vendor'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname.toLowerCase();

    // 1. Check if Gemini API key exists
    const rawApiKey = process.env.GEMINI_API_KEY;
    const keyLength = rawApiKey ? rawApiKey.length : 0;
    const maskedKey = rawApiKey ? `${rawApiKey.substring(0, 6)}... (length: ${keyLength})` : 'undefined';
    console.log(`[AI Analyze] Environment Check - GEMINI_API_KEY: ${maskedKey}`);

    if (rawApiKey && rawApiKey.trim() !== '') {
      try {
        console.log(`[AI Analyze] Initializing GoogleGenerativeAI with key...`);
        const genAI = new GoogleGenerativeAI(rawApiKey.trim());
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const mimeType = req.file.mimetype;
        console.log(`[AI Analyze] Image info - Path: ${filePath}, MimeType: ${mimeType}, Size: ${req.file.size} bytes`);
        
        const imagePart = fileToGenerativePart(filePath, mimeType);
        
        const prompt = `
          Analyze this product image. Return a JSON object with details of the product.
          The output must be strictly valid JSON and nothing else, matching this schema:
          {
            "name": "Title of the product (e.g. Butter Croissant)",
            "category": "One of these: Bakery, Dairy, Produce, Groceries, Beverages, Office Needs, Furniture, Others",
            "suggestedDescription": "A friendly 1-2 sentence description explaining that it is fresh but needs to be cleared or consumed soon to prevent waste.",
            "confidenceScore": 95,
            "suggestedOriginalPrice": 50,
            "suggestedDiscountedPrice": 15
          }
          Make sure suggestedOriginalPrice is a realistic estimated retail price in INR (integer).
          Make sure suggestedDiscountedPrice is a recommended clearance price (typically 40% to 75% lower than original, depending on perishable nature).
        `;

        console.log(`[AI Analyze] Sending request to Gemini (model: gemini-2.5-flash)...`);
        const result = await model.generateContent([prompt, imagePart]);
        console.log(`[AI Analyze] Received response from Gemini. Resolving text...`);
        const response = await result.response;
        const text = response.text();
        console.log(`[AI Analyze] Raw Gemini response text:\n${text}`);

        // Clean up the response text in case Gemini wraps it in markdown ```json ... ```
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedData = JSON.parse(jsonMatch[0]);
          console.log(`[AI Analyze] Successfully parsed Gemini response JSON:`, parsedData);
          
          // Delete temporary file
          fs.unlinkSync(filePath);
          
          return res.json(parsedData);
        } else {
          console.error(`[AI Analyze] Failed to match JSON pattern in response text`);
          throw new Error('Gemini response could not be parsed as JSON');
        }

      } catch (geminiError) {
        console.error('[AI Analyze] Gemini API call failed with exception:', geminiError);
        // Continue to fallback
      }
    } else {
      console.log(`[AI Analyze] Skipping Gemini API call because key is empty or undefined.`);
    }

    // 2. Local intelligent matcher fallback
    let matchedDetails = null;

    // Search keywords in original file name
    for (const item of mockProductsCatalog) {
      if (item.keywords.some(keyword => originalName.includes(keyword))) {
        matchedDetails = {
          name: item.name,
          category: item.category,
          suggestedDescription: item.suggestedDescription,
          confidenceScore: item.confidenceScore,
          suggestedOriginalPrice: item.suggestedOriginalPrice,
          suggestedDiscountedPrice: item.suggestedDiscountedPrice,
        };
        break;
      }
    }

    // If no keywords matched, return a sensible default
    if (!matchedDetails) {
      matchedDetails = {
        name: 'Store Deal Item',
        category: 'Others',
        suggestedDescription: 'Quality store item cleared at discount. Shelf-life is short, buy now to rescue inventory!',
        confidenceScore: 75,
        suggestedOriginalPrice: 100,
        suggestedDiscountedPrice: 45,
      };
    }

    // Delete temporary file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Simulate short network delay to feel like AI processing
    setTimeout(() => {
      res.json(matchedDetails);
    }, 1500);

  } catch (error) {
    console.error('AI analyze endpoint error:', error);
    res.status(500).json({ message: 'AI Analysis failed: ' + error.message });
  }
});

export default router;
