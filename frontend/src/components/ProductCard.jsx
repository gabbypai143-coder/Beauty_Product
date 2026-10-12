import React from 'react';
import { ShoppingBag, Eye, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/shipping';

export const ProductCard = ({ product, onQuickView }) => {
  const { addToCart } = useCart();
  const isOutOfStock = Number(product.stock) <= 0;
  const isPackage = String(product.productType || '').toUpperCase() === 'PACKAGE';

  return (
    <div className="group bg-white rounded-2xl border border-[#235848]/10 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
      {/* Product Image Area */}
      <div className="relative aspect-square bg-[#faf8f5] overflow-hidden cursor-pointer" onClick={() => onQuickView(product)}>
        <img
          src={product.imageUrl || '/assets/images/hero1.jpg.png'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.src = '/assets/images/hero1.jpg.png';
          }}
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {isPackage && (
            <span className="badge bg-[#c49a45] text-white font-bold text-[10px] shadow-sm">
              <Package size={11} />
              Package
            </span>
          )}
          {isOutOfStock ? (
            <span className="badge badge-cancelled text-[10px] shadow-sm">
              Sold Out
            </span>
          ) : Number(product.stock) <= 5 ? (
            <span className="badge badge-pending text-[10px] shadow-sm">
              Only {product.stock} left
            </span>
          ) : null}
        </div>

        {/* Quick View Floating Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickView(product);
          }}
          className="absolute bottom-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-md text-[#235848] opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-white"
          title="Quick View"
        >
          <Eye size={16} />
        </button>
      </div>

      {/* Card Info Area */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between space-y-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#c49a45]">
            {product.category || 'Skincare'}
          </span>
          <h3
            onClick={() => onQuickView(product)}
            className="font-serif text-base sm:text-lg font-bold text-[#1b2420] mt-0.5 line-clamp-1 cursor-pointer hover:text-[#235848] transition-colors"
          >
            {product.name}
          </h3>
          <p className="text-xs text-[#63706a] line-clamp-2 mt-1">
            {product.description || 'Gentle nourishing botanical formula for daily skin wellness.'}
          </p>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-gray-100">
          <div>
            <span className="text-xs text-gray-400 block -mb-0.5">Price</span>
            <span className="text-base sm:text-lg font-bold text-[#235848]">
              {formatCurrency(product.price)}
            </span>
          </div>

          <button
            onClick={() => addToCart(product, 1)}
            disabled={isOutOfStock}
            className={`p-2.5 rounded-full flex items-center justify-center transition-all ${
              isOutOfStock
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-[#235848] text-white hover:bg-[#194437] shadow-sm hover:scale-105'
            }`}
            title={isOutOfStock ? 'Sold Out' : 'Add to Bag'}
          >
            <ShoppingBag size={17} />
          </button>
        </div>
      </div>
    </div>
  );
};
