export default function Points() {
  return (
    <div className="space-y-4">
      <div className="text-2xl font-semibold">Your Points</div>
      <div className="rounded bg-white/10 p-4">
        <div className="text-3xl font-bold">0</div>
        <div className="opacity-80 text-sm">1 point per $1 spent</div>
      </div>

      <div className="text-xl font-semibold mt-6">Rewards</div>
      <ul className="space-y-2">
        <li className="rounded bg-white/10 p-3 flex items-center justify-between">
          <div>
            <div className="font-semibold">Free 2oz Espresso Shot</div>
            <div className="opacity-80 text-sm">50 points</div>
          </div>
          <button className="px-3 py-2 bg-white/10 rounded">Redeem</button>
        </li>
      </ul>
    </div>
  );
}
