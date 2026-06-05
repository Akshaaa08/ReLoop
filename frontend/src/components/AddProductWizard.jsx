import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Upload, Sparkles, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';

const AddProductWizard = ({ onComplete }) => {
  const { t, fetchProducts } = useApp();
  const { user, token } = useAuth();
  
  const [step, setStep] = useState(1);
  const [loadingAI, setLoadingAI] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Bakery');
  const [description, setDescription] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountedPrice, setDiscountedPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [expiryDate, setExpiryDate] = useState(() => {
    // Default to 1 day from now
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
    return tomorrow.toISOString().slice(0, 16);
  });
  
  const [confidenceScore, setConfidenceScore] = useState(0);

  const categoriesList = ['Bakery', 'Dairy', 'Produce', 'Groceries', 'Beverages', 'Office Needs', 'Furniture', 'Others'];

  // Handle image selection
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    triggerAIAnalysis(file);
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      triggerAIAnalysis(file);
    }
  };

  // Call Gemini AI analyze endpoint
  const triggerAIAnalysis = async (file) => {
    setLoadingAI(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setName(data.name || '');
        setCategory(data.category || 'Bakery');
        setDescription(data.suggestedDescription || '');
        setConfidenceScore(data.confidenceScore || 85);
        setOriginalPrice(data.suggestedOriginalPrice || '');
        setDiscountedPrice(data.suggestedDiscountedPrice || '');
        setStep(2); // Go to details step automatically!
      } else {
        console.error('AI analyze error');
        setStep(2); // Fallback to details anyways so vendor can input manually
      }
    } catch (err) {
      console.error(err);
      setStep(2);
    } finally {
      setLoadingAI(false);
    }
  };

  // Submit Deal Listing to backend
  const handleSubmitListing = async () => {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('name', name);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('originalPrice', originalPrice);
    formData.append('discountedPrice', discountedPrice);
    formData.append('quantity', quantity);
    formData.append('expiryDate', expiryDate);

    try {
      const res = await fetch('/api/vendor/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        if (fetchProducts) fetchProducts();
        setStep(4); // Success step!
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to list product');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting product listing');
    }
  };

  // Calculate discount percentage
  const calculateDiscount = () => {
    if (!originalPrice || !discountedPrice) return 0;
    const orig = parseFloat(originalPrice);
    const disc = parseFloat(discountedPrice);
    if (orig <= 0) return 0;
    return Math.round(((orig - disc) / orig) * 100);
  };

  return (
    <div className="wizard-container">
      {/* Wizard Header Progress Indicator */}
      {step < 4 && (
        <div className="wizard-steps">
          <div className={`wizard-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <div className="wizard-step-num">1</div>
            <span className="wizard-step-label">{t('stepUpload')}</span>
          </div>
          <div className={`wizard-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <div className="wizard-step-num">2</div>
            <span className="wizard-step-label">{t('stepDetails')}</span>
          </div>
          <div className={`wizard-step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
            <div className="wizard-step-num">3</div>
            <span className="wizard-step-label">{t('stepReview')}</span>
          </div>
        </div>
      )}

      {/* STEP 1: UPLOAD */}
      {step === 1 && (
        <div>
          <h2 style={{ marginBottom: '8px' }}>{t('addProduct')}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
            Upload an image of the product. ReLoop AI will automatically scan the item, label it, and write a description to save you time.
          </p>

          {loadingAI ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 40px',
                border: '2px dashed var(--primary-green)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--light-green)',
                textAlign: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid var(--border-color)',
                  borderTopColor: 'var(--primary-green)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              ></div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <h3 style={{ color: 'var(--primary-green)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} /> {t('loadingAI')}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Analyzing tags, packaging, and shelf condition...
              </p>
            </div>
          ) : (
            <label 
              className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="upload-icon" />
              <div>
                <h3 style={{ marginBottom: '4px' }}>{t('dragDropImage')}</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                  Supports JPEG, PNG, WEBP files up to 5MB
                </p>
              </div>
              <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
            </label>
          )}
        </div>
      )}

      {/* STEP 2: FILL DETAILS */}
      {step === 2 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <button className="icon-btn" onClick={() => setStep(1)}>
              <ArrowLeft size={16} />
            </button>
            <h2>Product Details</h2>
          </div>

          {/* Gemini AI Autofill badge */}
          {confidenceScore > 0 && (
            <div className="ai-badge">
              <Sparkles size={14} />
              <div>
                <span>{t('aiDetection')}</span>
                <div style={{ fontSize: '10px', fontWeight: 500 }}>
                  Confidence: {confidenceScore}%
                </div>
                <div className="ai-confidence-bar" style={{ width: '120px' }}>
                  <div className="ai-confidence-fill" style={{ width: `${confidenceScore}%` }}></div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px' }}>
            {/* Left Col: Image Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }} />
              <label className="btn-secondary" style={{ textAlign: 'center', cursor: 'pointer' }}>
                <Upload size={14} />
                <span>{t('changeImage')}</span>
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Right Col: Fields */}
            <div>
              <div className="form-group">
                <label className="form-label">{t('detectedProduct')}</label>
                <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">{t('category')}</label>
                <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('suggestedDesc')}</label>
                <textarea className="form-control" style={{ height: '80px', resize: 'none' }} value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div className="form-group">
              <label className="form-label">{t('originalPrice')}</label>
              <input type="number" className="form-control" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="e.g. 50" required />
            </div>

            <div className="form-group">
              <label className="form-label">{t('discountedPrice')}</label>
              <input type="number" className="form-control" value={discountedPrice} onChange={(e) => setDiscountedPrice(e.target.value)} placeholder="e.g. 15" required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label">{t('quantity')}</label>
              <input type="number" className="form-control" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" required />
            </div>

            <div className="form-group">
              <label className="form-label">{t('expiryTime')}</label>
              <input type="datetime-local" className="form-control" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
            </div>
          </div>

          {/* Pricing warning if discounted >= original */}
          {originalPrice && discountedPrice && parseFloat(discountedPrice) >= parseFloat(originalPrice) && (
            <div style={{ display: 'flex', gap: '8px', color: 'var(--danger-color)', fontSize: '12px', alignItems: 'center', marginTop: '8px' }}>
              <AlertCircle size={14} />
              <span>Discounted price should be lower than original price.</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button
              className="btn-primary"
              onClick={() => setStep(3)}
              disabled={!name || !originalPrice || !discountedPrice || parseFloat(discountedPrice) >= parseFloat(originalPrice)}
            >
              <span>{t('next')}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW */}
      {step === 3 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <button className="icon-btn" onClick={() => setStep(2)}>
              <ArrowLeft size={16} />
            </button>
            <h2>{t('stepReview')}</h2>
          </div>

          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
            Verify your deal details before publishing. Listing this deal will make it visible to local buyers within your store's neighborhood.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: '30px',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            {/* Image card layout */}
            <div style={{ position: 'relative' }}>
              <span className="deal-badge danger" style={{ top: 12, left: 12 }}>
                {calculateDiscount()}% OFF
              </span>
              <img src={imagePreview} alt={name} style={{ width: '100%', height: '260px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
            </div>

            {/* Info details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                  {category}
                </span>
                <h3 style={{ fontSize: '20px', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {name}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary-green)' }}>
                  ₹{discountedPrice}
                </span>
                <span style={{ fontSize: '16px', color: 'var(--text-light)', textDecoration: 'line-through' }}>
                  ₹{originalPrice}
                </span>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Quantity: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{quantity} pcs</span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Expires: <span style={{ color: 'var(--danger-color)', fontWeight: 700 }}>{new Date(expiryDate).toLocaleString()}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-light)' }}>
                  Listing Description
                </span>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                  {description}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px' }}>
            <button className="btn-secondary" onClick={() => setStep(2)}>
              {t('back')}
            </button>
            <button className="btn-primary" onClick={handleSubmitListing}>
              <Sparkles size={16} />
              <span>{t('submit')}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS */}
      {step === 4 && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ color: 'var(--success-color)', display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <CheckCircle size={64} />
          </div>
          <h2 style={{ marginBottom: '12px' }}>Deal Published Successfully!</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto 30px auto', fontSize: '14px' }}>
            Your deal for **{name}** is now live. Customers searching in Connaught Place will discover your bakery and deal. Keep an eye out for customer contacts!
          </p>
          <button className="btn-primary" onClick={onComplete} style={{ margin: '0 auto' }}>
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};

export default AddProductWizard;
