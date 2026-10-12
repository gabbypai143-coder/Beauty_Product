// J&T Express Heavy Parcel Rates (3.01 kg to 10.00 kg)
export const getHeavyParcelRate = (weight) => {
  const w = Number(weight) || 0;
  if (w > 3.00 && w <= 4.00) return 200;
  if (w > 4.00 && w <= 5.00) return 220;
  if (w > 5.00 && w <= 6.00) return 255;
  if (w > 6.00 && w <= 7.00) return 295;
  if (w > 7.00 && w <= 8.00) return 335;
  if (w > 8.00 && w <= 9.00) return 375;
  if (w > 9.00 && w <= 10.00) return 415;
  return null;
};

// Regional standard base rates for Small Parcels (<= 3.00 kg)
export const getRegionalBaseRate = (region) => {
  const r = String(region || '').trim();
  if (!r) return 0;
  const rates = {
    'NCR': 105,
    'CAR': 105,
    'Region I': 105,
    'Region II': 105,
    'Region III': 105,
    'Region IV-A': 105,
    'Region IV-B': 115,
    'Region V': 105,
    'Region VI': 105,
    'Region VII': 105,
    'Region VIII': 105,
    'Region IX': 85,
    'Region X': 85,
    'Region XI': 85,
    'Region XII': 85,
    'Region XIII': 85,
    'BARMM': 115
  };
  return rates[r] || (r ? 105 : 0);
};

// Calculate aggregate parcel weight: Total Weight = sum(Product Weight * Quantity)
export const calculateTotalWeight = (items) => {
  const list = Array.isArray(items) ? items : [];
  let total = 0;
  list.forEach((item) => {
    const qty = Number(item?.qty ?? item?.quantity ?? 1);
    const q = Number.isFinite(qty) && qty > 0 ? qty : 1;
    const rawW = Number(item?.weight_kg ?? item?.weight);
    const weight = Number.isFinite(rawW) && rawW > 0 ? rawW : 0.20;
    total += weight * q;
  });
  return Math.round(total * 100) / 100;
};

// Calculate dynamic shipping breakdown according to J&T Express structure
export const calculateCheckoutShipping = (region, weight, subtotal) => {
  const w = Number(weight) || 0;
  const sub = Number(subtotal) || 0;
  const isOverLimit = w > 10.00;

  let baseRate = 0;
  if (w > 3.00 && w <= 10.00) {
    baseRate = getHeavyParcelRate(w) || 0;
  } else {
    baseRate = getRegionalBaseRate(region);
  }

  // J&T Assurance / Insurance Fee: ceil(Subtotal / 500) * 5
  const insuranceFee = sub > 0 ? Math.ceil(sub / 500) * 5 : 0;
  const totalShipping = baseRate + insuranceFee;

  return {
    totalWeight: Math.round(w * 100) / 100,
    baseRate,
    insuranceFee,
    totalShipping,
    isOverLimit
  };
};

export const formatCurrency = (val) => {
  const n = Number(val) || 0;
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
