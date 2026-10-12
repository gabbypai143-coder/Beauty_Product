import React, { useState } from 'react';
import { X, ShoppingBag, Plus, Minus, Check, Package, Sparkles, Droplets } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/shipping';

export const ProductDetailModal = ({ product, isOpen, onClose }) => {
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!isOpen || !product) return null;

  const isOutOfStock = Number(product.stock) <= 0;
  const isPackage = String(product.productType || '').toUpperCase() === 'PACKAGE';

  let packageItemsList = [];
  if (isPackage) {
    if (Array.isArray(product.packageItems)) {
      packageItemsList = product.packageItems;
    } else if (typeof product.packageItems === 'string') {
      try {
        packageItemsList = JSON.parse(product.packageItems);
      } catch {
        packageItemsList = [];
      }
    }
  }

  const handleAdd = () => {
    if (isOutOfStock) return;
    addToCart(product, qty);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 600);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card max-w-2xl relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 backdrop-blur-md text-gray-500 hover:text-black shadow-sm transition-colors"
        >
          <X size={20} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Product Image */}
          <div className="relative bg-[#faf8f5] flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-[#235848]/10">
            <img
              src={product.imageUrl || '/assets/images/hero1.jpg.png'}
              alt={product.name}
              className="max-h-72 md:max-h-96 w-full object-contain rounded-xl"
              onError={(e) => {
                e.target.src = '/assets/images/hero1.jpg.png';
              }}
            />
            {isPackage && (
              <span className="absolute top-4 left-4 badge bg-[#c49a45] text-white font-bold text-xs shadow-md">
                <Package size={13} />
                Package Bundle
              </span>
            )}
          </div>

          {/* Details Content */}
          <div className="p-6 md:p-8 flex flex-col justify-between space-y-5">
            <div>
              <span className="text-xs uppercase tracking-widest font-bold text-[#c49a45]">
                {product.category || 'Botanical Formula'}
              </span>
              <h2 className="font-serif text-2xl font-bold text-[#1b2420] mt-1">
                {product.name}
              </h2>

              <div className="flex items-center gap-3 mt-2">
                <span className="text-xl font-bold text-[#235848]">
                  {formatCurrency(product.price)}
                </span>
                <span
                  className={`badge text-xs ${
                    isOutOfStock ? 'badge-cancelled' : 'badge-delivered'
                  }`}
                >
                  {isOutOfStock ? 'Out of Stock' : `In Stock (${product.stock} available)`}
                </span>
              </div>

              {/* Description */}
              {product.description && (
                <div className="mt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-[#c49a45]" />
                    Product Description
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed max-h-28 overflow-y-auto pr-1">
                    {product.description}
                  </p>
                </div>
              )}

              {/* How to Use */}
              {product.usage && (
                <div className="mt-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                    <Droplets size={13} className="text-[#235848]" />
                    How to Apply
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed italic bg-[#faf8f5] p-2.5 rounded-lg border border-[#235848]/10">
                    {product.usage}
                  </p>
                </div>
              )}

              {/* Package Bundle Contents */}
              {isPackage && packageItemsList.length > 0 && (
                <div className="mt-4 bg-[#e9f2ee] p-3 rounded-xl border border-[#235848]/15">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#235848] mb-2 flex items-center gap-1.5">
                    <Package size={14} />
                    Included in this Bundle
                  </h4>
                  <ul className="text-xs text-gray-700 space-y-1">
                    {packageItemsList.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#235848]" />
                        <span>
                          {typeof item === 'object' ? `${item.name || item.title} (x${item.quantity || item.qty || 1})` : item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Quantity Selector & Add Button */}
            <div className="pt-4 border-t border-gray-100 flex items-center gap-3">
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-[#faf8f5]">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={isOutOfStock || qty <= 1}
                  className="p-2.5 text-gray-600 hover:text-black hover:bg-gray-100 disabled:opacity-30"
                >
                  <Minus size={15} />
                </button>
                <span className="px-3 text-sm font-bold text-gray-900 min-w-8 text-center">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(Number(product.stock) || 999, q + 1))}
                  disabled={isOutOfStock || qty >= (Number(product.stock) || 999)}
                  className="p-2.5 text-gray-600 hover:text-black hover:bg-gray-100 disabled:opacity-30"
                >
                  <Plus size={15} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                disabled={isOutOfStock}
                className="flex-1 btn btn-primary py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {added ? (
                  <>
                    <Check size={18} />
                    <span>Added to Bag!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag size={18} />
                    <span>{isOutOfStock ? 'Sold Out' : 'Add to Bag'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
