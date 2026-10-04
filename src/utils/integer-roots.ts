/** Newton iteration for floor(√n), n ≥ 0. */
export const isqrt = (n: bigint): bigint => {
	if (n < 2n) {
		return n;
	}
	let x = 1n << BigInt(Math.ceil((n.toString(2).length + 1) / 2));
	let y = (x + n / x) >> 1n;
	while (y < x) {
		x = y;
		y = (x + n / x) >> 1n;
	}
	return x;
};

/** Newton iteration for floor(∛n), n ≥ 0. */
export const icbrt = (n: bigint): bigint => {
	if (n < 2n) {
		return n;
	}
	// 2^ceil((bits + 1)/3) cubed reaches ≥ 2^(bits+1) > 2n > n, so the start
	// sits strictly above the real cube root (within a factor ~2.6 of it).
	// Real Newton iterates y ← (2y + n/y²)/3 never drop below ∛n — AM-GM
	// gives (y + y + n/y²)/3 ≥ (n)^(1/3) — and shrink strictly while above
	// it (n/y² < y ⟺ n < y³), so the integer sequence never undershoots
	// floor(∛n), reaches it, and stops once the next step stops decreasing,
	// i.e. at the floor.
	let x = 1n << BigInt(Math.ceil((n.toString(2).length + 1) / 3));
	let y = (2n * x + n / (x * x)) / 3n;
	while (y < x) {
		x = y;
		y = (2n * x + n / (x * x)) / 3n;
	}
	return x;
};
