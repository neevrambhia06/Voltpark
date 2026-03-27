// ── VOLTpark Price Calculator ──
// Platform takes 15% fee from each booking
// Owner receives booking amount minus 10% admin commission

const PLATFORM_FEE_RATE     = 0.15   // 15% platform fee (user-facing)
const GST_RATE              = 0.18   // 18% GST
const OWNER_COMMISSION_RATE = 0.10   // 10% admin cut from owner's share

export const calculatePrice = ({
  pricePerHour,
  durationHours,
  discount = 0,
}) => {
  const base = Math.round(
    pricePerHour * durationHours * 100
  ) / 100

  const afterDiscount = Math.max(0, base - discount)

  const platformFee = Math.round(
    afterDiscount * PLATFORM_FEE_RATE * 100
  ) / 100

  const taxableAmount = afterDiscount + platformFee

  const gstAmount = Math.round(
    taxableAmount * GST_RATE * 100
  ) / 100

  const total = Math.round(
    (taxableAmount + gstAmount) * 100
  ) / 100

  return {
    pricePerHour,
    durationHours,
    baseAmount:   base,
    discount,
    platformFee,
    gstAmount,
    subtotal:     afterDiscount,
    total,
  }
}

// Calculate owner payout after admin commission
export const calculateOwnerPayout = (bookingAmount) => {
  const commission = Math.round(bookingAmount * OWNER_COMMISSION_RATE * 100) / 100
  const payout = Math.round((bookingAmount - commission) * 100) / 100
  return {
    bookingAmount,
    platformCommission: commission,
    ownerPayout: payout,
    commissionRate: OWNER_COMMISSION_RATE,
  }
}

export const formatDuration = (hours) => {
  if (hours < 1) {
    return `${Math.round(hours * 60)} mins`
  }
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`
  return `${h} hr ${m} min`
}

export const formatCurrency = (amount) =>
  `Rs.${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

// Plan definitions for reference
export const LISTING_PLANS = {
  free:     { label: 'Free',     price: 0,    maxProperties: 1 },
  basic:    { label: 'Basic',    price: 499,  maxProperties: 1 },
  pro:      { label: 'Pro',      price: 999,  maxProperties: 3 },
  business: { label: 'Business', price: 2499, maxProperties: Infinity },
}

export const FEATURED_PRICING = {
  '7d':  { label: '7 Days',  price: 299 },
  '30d': { label: '30 Days', price: 999 },
  'monthly': { label: 'Monthly', price: 2999 },
}
