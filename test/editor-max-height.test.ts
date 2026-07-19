import assert from "node:assert";
import { describe, it } from "node:test";
import { Editor } from "../src/components/editor.ts";
import { TUI } from "../src/tui.ts";
import { defaultEditorTheme } from "./test-themes.ts";
import { VirtualTerminal } from "./virtual-terminal.ts";

function createEditor(cols = 80, rows = 24): { tui: TUI; editor: Editor } {
	const tui = new TUI(new VirtualTerminal(cols, rows));
	const editor = new Editor(tui, defaultEditorTheme);
	return { tui, editor };
}

function fillLines(editor: Editor, count: number): void {
	for (let i = 1; i < count; i++) {
		editor.handleInput("\n");
	}
}

describe("editor maxHeight", () => {
	it("defaults to 30% of terminal rows with a floor of 5 content lines", () => {
		const { editor } = createEditor(80, 24);
		fillLines(editor, 20);
		// 30% of 24 = 7 content lines + 2 borders
		assert.strictEqual(editor.render(80).length, 9);
	});

	it("explicit maxHeight caps total rows including borders", () => {
		const { editor } = createEditor(80, 24);
		editor.setMaxHeight(5);
		fillLines(editor, 20);
		// 5 total = 3 content + 2 borders
		assert.strictEqual(editor.render(80).length, 5);
	});

	it("pins content to one row for budgets below the 3-row floor", () => {
		const { editor } = createEditor(80, 24);
		editor.setMaxHeight(1);
		fillLines(editor, 20);
		// Floored to 3 total = 1 content + 2 borders
		assert.strictEqual(editor.render(80).length, 3);
	});

	it("clearing maxHeight restores the default policy", () => {
		const { editor } = createEditor(80, 24);
		editor.setMaxHeight(5);
		fillLines(editor, 20);
		assert.strictEqual(editor.render(80).length, 5);
		editor.setMaxHeight(undefined);
		assert.strictEqual(editor.render(80).length, 9);
	});

	it("keeps the cursor row visible within the capped window", () => {
		const { editor } = createEditor(80, 24);
		editor.setMaxHeight(4); // 2 content rows
		fillLines(editor, 10);
		const lines = editor.render(80);
		assert.strictEqual(lines.length, 4);
		// Cursor sits on the last logical line; it must be in the visible slice
		// (last content row before the bottom border/scroll indicator).
		assert.match(lines[lines.length - 2]!, /\x1b\[7m/);
	});
});
