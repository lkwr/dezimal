import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/ops/absolute.ts";

describe("absolute", () => {
	it("removes the sign of negative values", () => {
		expect(new Decimal("-1.5").absolute().raw).toEqual([15n, -1]);
	});

	it("keeps positive values and zero", () => {
		expect(new Decimal("1.5").absolute().raw).toEqual([15n, -1]);
		expect(new Decimal(0).absolute().raw).toEqual([0n, 0]);
	});

	it("exposes the abs alias", () => {
		expect(new Decimal(-7n).abs().raw).toEqual([7n, 0]);
	});
});
