import React from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';

const QuantityControl = ({ quantity, maxStock, unitPrice, onChange, isCartItem = false, style = {} }) => {
  const handleDecrease = (e) => {
    e.stopPropagation();
    if (quantity > 1) {
      onChange(quantity - 1);
    } else if (isCartItem && quantity === 1) {
      onChange(0); // Triggers remove in cart
    }
  };

  const handleIncrease = (e) => {
    e.stopPropagation();
    if (quantity < maxStock) {
      onChange(quantity + 1);
    }
  };

  const lineTotal = quantity * unitPrice;

  return (
    <div className="quantity-control-container" style={style} onClick={(e) => e.stopPropagation()}>
      <div className="quantity-controls">
        <button
          type="button"
          className="quantity-btn btn-minus"
          onClick={handleDecrease}
          disabled={!isCartItem && quantity <= 1}
          title={isCartItem && quantity === 1 ? "Remove item" : "Decrease quantity"}
        >
          {isCartItem && quantity === 1 ? <Trash2 size={13} style={{ color: 'var(--danger-color)' }} /> : <Minus size={13} />}
        </button>
        
        <span className="quantity-value">{quantity}</span>
        
        <button
          type="button"
          className="quantity-btn btn-plus"
          onClick={handleIncrease}
          disabled={quantity >= maxStock}
          title={quantity >= maxStock ? "Maximum stock reached" : "Increase quantity"}
        >
          <Plus size={13} />
        </button>
      </div>
      
      {unitPrice !== undefined && (
        <div className="quantity-total">
          <span className="quantity-total-label">Total: </span>
          <span className="quantity-total-price">₹{lineTotal}</span>
        </div>
      )}
    </div>
  );
};

export default QuantityControl;
