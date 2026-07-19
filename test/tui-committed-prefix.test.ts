import assert from "node:assert";
import { describe, it } from "node:test";
import { type Component, TUI } from "../src/tui.ts";
import { VirtualTerminal } from "./virtual-terminal.ts";

class TestComponent implements Component {
	lines: string[] = [];
	render(_width: number): string[] {
		return this.lines;
	}
	invalidate(): void {}
}

function getScreenLines(terminal: VirtualTerminal): string[] {
	const xterm = (terminal as unknown as { xterm: import("@xterm/headless").Terminal }).xterm;
	const buffer = xterm.buffer.active;
	const lines: string[] = [];
	for (let i = 0; i < terminal.rows; i++) {
		const line = buffer.getLine(buffer.viewportY + i);
		lines.push(line ? line.translateToString(true) : "");
	}
	return lines;
}

function stripAnsi(s: string): string {
	// eslint-disable-next-line no-control-regex
	return s.replace(/\x1b\[[0-9;:]*m|\x1b\]8;;\x07/g, "");
}

describe("committed prefix rendering", () => {
	it("keeps screen correct across commit, append, and in-place typing frames", async () => {
		const height = 10;
		const terminal = new VirtualTerminal(40, height);
		const tui = new TUI(terminal);
		const transcript = new TestComponent();
		const editor = new TestComponent();
		tui.addChild(transcript);
		tui.addChild(editor);

		// Initial short content
		transcript.lines = ["t0", "t1"];
		editor.lines = ["[editor]"];
		tui.start();
		await terminal.waitForRender();

		const allLines = (): string[] => [...transcript.lines, ...editor.lines];

		// Grow the transcript well past the viewport so rows commit.
		for (let round = 2; round < 40; round++) {
			transcript.lines.push(`t${round}`);
			tui.requestRender();
			await terminal.waitForRender();
		}

		// Invariant: previousLines must align with committedRows
		const state = tui as unknown as { previousLines: string[]; committedRows: number; committedPrefix: string[] };
		assert.ok(state.committedRows > 0, "rows should have committed");
		assert.strictEqual(
			state.previousLines.length,
			allLines().length - state.committedRows,
			`previousLines (${state.previousLines.length}) must equal window size (${allLines().length - state.committedRows})`,
		);
		assert.strictEqual(
			stripAnsi(state.previousLines[0] ?? ""),
			allLines()[state.committedRows],
			"previousLines[0] must be the line at committedRows (alignment)",
		);

		// Simulate typing: change only the editor line, several frames.
		for (const text of ["h", "he", "hel", "hell", "hello"]) {
			editor.lines = [`[editor] ${text}`];
			tui.requestRender();
			await terminal.waitForRender();

			const expected = allLines().slice(-height);
			const screen = getScreenLines(terminal);
			for (let row = 0; row < height; row++) {
				assert.strictEqual(
					screen[row]?.trimEnd(),
					(expected[row] ?? "").trimEnd(),
					`row ${row} mismatch after typing "${text}"`,
				);
			}

			// Alignment invariant must hold after every frame.
			assert.strictEqual(
				state.previousLines.length,
				allLines().length - state.committedRows,
				`previousLines misaligned after typing "${text}"`,
			);
			assert.strictEqual(stripAnsi(state.previousLines[0] ?? ""), allLines()[state.committedRows]);
		}

		// Grow again after commits (streaming while typing).
		for (let round = 40; round < 60; round++) {
			transcript.lines.push(`t${round}`);
			tui.requestRender();
			await terminal.waitForRender();
			const expected = allLines().slice(-height);
			const screen = getScreenLines(terminal);
			for (let row = 0; row < height; row++) {
				assert.strictEqual(
					screen[row]?.trimEnd(),
					(expected[row] ?? "").trimEnd(),
					`row ${row} mismatch after append t${round}`,
				);
			}
		}

		tui.stop();
	});
});
