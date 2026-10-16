// Round to 2 decimals without floating-point drift (0.1 + 0.2 problems).
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Works out the bill from trusted (database) prices.
function priceOrder(lines, taxPercent) {
  const subtotal = round2(lines.reduce((sum, l) => sum + l.price * l.qty, 0));
  const tax = round2((subtotal * taxPercent) / 100);
  return { subtotal, tax, total: round2(subtotal + tax) };
}

module.exports = { round2, priceOrder };
