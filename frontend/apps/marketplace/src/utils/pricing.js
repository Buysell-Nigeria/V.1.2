// BUYSELL API stores and charges monetary values in Nigerian kobo.
// This is a UI estimate only: the server remains authoritative on checkout.
export const formatNaira = value => `₦${(Number(value || 0) / 100).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
export function getOrderEstimate(items = []) {
  const sellerSubtotals = new Map();
  let subtotal = 0;
  let shipping = 0;
  for (const item of items) {
    const quantity = Math.max(1, Math.round(Number(item.quantity || 1)));
    const line = Math.max(0, Number(item.price || 0)) * quantity;
    const delivery = Math.max(0, Number(item.shipping_fee || 0)) * quantity;
    subtotal += line;
    shipping += delivery;
    const seller = String(item.seller_id || 'unassigned');
    sellerSubtotals.set(seller, (sellerSubtotals.get(seller) || 0) + line);
  }
  const platformFee = [...sellerSubtotals.values()].reduce((sum, value) => sum + Math.round(value * 0.03), 0);
  return { subtotal, shipping, platformFee, total: subtotal + shipping + platformFee };
}
