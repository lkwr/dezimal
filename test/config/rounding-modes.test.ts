import type { RoundingMode } from "dezi";
import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/config/rounding-modes.ts";

const modes: RoundingMode[] = [
	"up",
	"down",
	"ceil",
	"floor",
	"half-up",
	"half-down",
	"half-even",
	"half-ceil",
	"half-floor",
];

describe("rounding mode", () => {
	it("is a string union, importable from the package root", () => {
		expect(modes).toHaveLength(9);
		const named: RoundingMode = "half-even";
		expect(named).toBe("half-even");
	});

	it("defaults `rounding` to half-up", () => {
		expect(Decimal.rounding).toBe("half-up");
		expect(modes).toContain(Decimal.rounding);
	});

	it("`rounding` accepts every documented mode", () => {
		try {
			for (const mode of modes) {
				Decimal.rounding = mode;
				expect(Decimal.rounding).toBe(mode);
			}
		} finally {
			Decimal.rounding = "half-up";
		}
		expect(Decimal.rounding).toBe("half-up");
	});

	it("rejects invalid modes at compile time", () => {
		try {
			// @ts-expect-error - "sideways" is not a RoundingMode
			Decimal.rounding = "sideways";
			// Runtime is unvalidated until a future `set()` extension, like
			// decimal.js direct assignments.
			expect(Decimal.rounding).toBe("sideways");
		} finally {
			Decimal.rounding = "half-up";
		}
	});
});
