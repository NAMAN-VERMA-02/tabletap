// The standard Indian veg / non-veg symbol.
export default function VegMark({ isVeg }) {
  const color = isVeg ? 'border-green-600 bg-green-600' : 'border-red-700 bg-red-700';
  return (
    <span
      title={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
      className={`inline-flex size-4 shrink-0 items-center justify-center border-2 bg-white ${color.split(' ')[0]}`}
    >
      <span className={`size-2 rounded-full ${color.split(' ')[1]}`} />
    </span>
  );
}
