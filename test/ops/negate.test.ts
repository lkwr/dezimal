import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/ops/negate.ts";

describe("negate", () => {
	it("flips the sign", () => {
		expect(new Decimal("1.5").negate().raw).toEqual([-15n, -1]);
		expect(new Decimal("-1.5").negate().raw).toEqual([15n, -1]);
	});

	it("keeps zero unsigned", () => {
		expect(new Decimal(0).negate().raw).toEqual([0n, 0]);
	});
});
