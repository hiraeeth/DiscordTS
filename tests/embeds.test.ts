import { describe, expect, test } from "bun:test";
import { embed, success, error, fields_to_pages, lines_to_pages, EMBED_COLORS } from "@/helpers/embeds";
import { navigation_row, next_index } from "@/helpers/pagination";
import { config } from "config";

describe("embed", () => {
	test("applies core fields and the configured accent colour", () => {
		const json = embed({ title: "Title", description: "Body" }).toJSON();
		expect(json.title).toBe("Title");
		expect(json.description).toBe("Body");
		expect(json.color).toBe(EMBED_COLORS.brand.int);
		expect(EMBED_COLORS.brand).toBe(config.accent);
	});

	test("accepts a string author and footer", () => {
		const json = embed({ author: "Someone", footer: "Bottom" }).toJSON();
		expect(json.author?.name).toBe("Someone");
		expect(json.footer?.text).toBe("Bottom");
	});

	test("sets a timestamp when requested", () => {
		expect(embed({ timestamp: true }).toJSON().timestamp).toBeDefined();
		expect(embed({}).toJSON().timestamp).toBeUndefined();
	});
});

describe("presets", () => {
	test("carry their palette colour", () => {
		expect(success("done").toJSON().color).toBe(EMBED_COLORS.success.int);
		expect(error("nope").toJSON().color).toBe(EMBED_COLORS.error.int);
	});

	test("let an explicit colour win", () => {
		expect(success({ description: "x", color: EMBED_COLORS.brand }).toJSON().color).toBe(EMBED_COLORS.brand.int);
	});
});

describe("fields_to_pages", () => {
	const items: number[] = [];
	for (let i = 0; i < 23; i++) items.push(i);

	test("splits into pages and caps fields per page at 25", () => {
		const pages = fields_to_pages(items, { per_page: 100, render: (value) => ({ name: `#${value}`, value: String(value) }) });
		expect(pages.length).toBe(1);
		expect(pages[0].toJSON().fields).toHaveLength(23);
	});

	test("chunks and numbers the footer", () => {
		const pages = fields_to_pages(items, { per_page: 10, render: (value) => ({ name: `#${value}`, value: String(value) }) });
		expect(pages).toHaveLength(3);
		expect(pages[0].toJSON().footer?.text).toBe("Page 1/3");
		expect(pages[2].toJSON().fields).toHaveLength(3);
	});

	test("returns a single empty page for no items", () => {
		expect(fields_to_pages([], { render: () => ({ name: "x", value: "y" }) })).toHaveLength(1);
	});
});

describe("lines_to_pages", () => {
	test("joins each page's description", () => {
		const pages = lines_to_pages(["a", "b", "c", "d"], { per_page: 2 });
		expect(pages).toHaveLength(2);
		expect(pages[0].toJSON().description).toBe("a\nb");
	});
});

describe("next_index", () => {
	test("navigates within bounds", () => {
		expect(next_index("paginate_first", 3, 5)).toBe(0);
		expect(next_index("paginate_prev", 3, 5)).toBe(2);
		expect(next_index("paginate_next", 3, 5)).toBe(4);
		expect(next_index("paginate_next", 4, 5)).toBe(4);
		expect(next_index("paginate_last", 0, 5)).toBe(4);
		expect(next_index("unknown", 2, 5)).toBe(2);
	});
});

describe("navigation_row", () => {
	test("disables the boundaries and shows a counter", () => {
		const row = navigation_row(0, 3).toJSON();
		expect(row.components).toHaveLength(5);
		expect(row.components[0].disabled).toBe(true);
		expect(row.components[1].disabled).toBe(true);
		expect(row.components[3].disabled).toBe(false);
		expect(row.components[4].disabled).toBe(false);
	});

	test("omits the counter when disabled", () => {
		expect(navigation_row(1, 3, { counter: false }).toJSON().components).toHaveLength(4);
	});

	test("disables everything when forced", () => {
		const row = navigation_row(1, 3, {}, true).toJSON();
		for (const component of row.components) expect(component.disabled).toBe(true);
	});
});
