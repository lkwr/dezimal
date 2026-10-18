import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/format/to-json.ts";

describe("toJSON", () => {
	it("serializes like toString", () => {
		expect(new Decimal("1.50").toJSON()).toBe("1.5");
		expect(new Decimal("1e-9").toJSON()).toBe("1e-9");
	});

	it("makes JSON.stringify lossless", () => {
		const json = JSON.stringify({
			total: new Decimal("0.1000000000000000055"),
		});
		expect(json).toBe('{"total":"0.1000000000000000055"}');
		const { total } = JSON.parse(json);
		expect(new Decimal(total).raw).toEqual([1000000000000000055n, -19]);
	});
});
