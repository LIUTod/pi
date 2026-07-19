import assert from "node:assert";
import { describe, it } from "node:test";
import { type Component, Container, TUI } from "../src/tui.ts";
import { VirtualTerminal } from "./virtual-terminal.ts";

class CountingComponent implements Component {
	renderCount = 0;
	lines: string[];
	constructor(lines: string[]) {
		this.lines = lines;
	}
	render(_width: number): string[] {
		this.renderCount++;
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

describe("component-scoped rendering", () => {
	it("re-renders only the requesting root subtree, reusing other roots", async () => {
		const terminal = new VirtualTerminal(40, 10);
		const tui = new TUI(terminal);
		const heavy = new CountingComponent(["heavy-1", "heavy-2", "heavy-3"]);
		const spinner = new CountingComponent(["spin-0"]);
		tui.addChild(heavy);
		tui.addChild(spinner);
		tui.start();
		await terminal.waitForRender();
		assert.strictEqual(heavy.renderCount, 1);
		assert.strictEqual(spinner.renderCount, 1);

		// Component-scoped frame: only the spinner's root re-renders.
		spinner.lines = ["spin-1"];
		tui.requestComponentRender(spinner);
		await terminal.waitForRender();
		assert.strictEqual(spinner.renderCount, 2, "spinner must re-render");
		assert.strictEqual(heavy.renderCount, 1, "heavy root must be reused");

		const screen = getScreenLines(terminal);
		assert.strictEqual(screen[0], "heavy-1");
		assert.strictEqual(screen[1], "heavy-2");
		assert.strictEqual(screen[2], "heavy-3");
		assert.strictEqual(screen[3], "spin-1");
		tui.stop();
	});

	it("reuses roots for a component nested inside a container root", async () => {
		const terminal = new VirtualTerminal(40, 10);
		const tui = new TUI(terminal);
		const heavy = new CountingComponent(["heavy"]);
		const wrap = new Container();
		const spinner = new CountingComponent(["spin-0"]);
		wrap.addChild(spinner);
		tui.addChild(heavy);
		tui.addChild(wrap);
		tui.start();
		await terminal.waitForRender();

		spinner.lines = ["spin-1"];
		tui.requestComponentRender(spinner);
		await terminal.waitForRender();
		assert.strictEqual(spinner.renderCount, 2);
		assert.strictEqual(heavy.renderCount, 1, "sibling root must be reused for nested targets");
		assert.strictEqual(getScreenLines(terminal)[1], "spin-1");
		tui.stop();
	});

	it("a concurrent full requestRender downgrades the frame to full compose", async () => {
		const terminal = new VirtualTerminal(40, 10);
		const tui = new TUI(terminal);
		const heavy = new CountingComponent(["heavy-0"]);
		const spinner = new CountingComponent(["spin-0"]);
		tui.addChild(heavy);
		tui.addChild(spinner);
		tui.start();
		await terminal.waitForRender();

		spinner.lines = ["spin-1"];
		tui.requestComponentRender(spinner);
		heavy.lines = ["heavy-1"];
		tui.requestRender(); // full intent must win over the pending narrow frame
		await terminal.waitForRender();
		assert.strictEqual(heavy.renderCount, 2, "full request must re-render heavy");
		assert.strictEqual(spinner.renderCount, 2);
		assert.strictEqual(getScreenLines(terminal)[0], "heavy-1");
		assert.strictEqual(getScreenLines(terminal)[1], "spin-1");
		tui.stop();
	});

	it("falls back to full compose when the target is not mounted", async () => {
		const terminal = new VirtualTerminal(40, 10);
		const tui = new TUI(terminal);
		const heavy = new CountingComponent(["heavy"]);
		tui.addChild(heavy);
		tui.start();
		await terminal.waitForRender();

		const ghost = new CountingComponent(["ghost"]);
		tui.requestComponentRender(ghost);
		await terminal.waitForRender();
		assert.strictEqual(heavy.renderCount, 2, "unresolvable target must fall back to full compose");
		tui.stop();
	});

	it("falls back to full compose while an overlay is visible", async () => {
		const terminal = new VirtualTerminal(40, 10);
		const tui = new TUI(terminal);
		const heavy = new CountingComponent(["heavy"]);
		const spinner = new CountingComponent(["spin-0"]);
		tui.addChild(heavy);
		tui.addChild(spinner);
		tui.start();
		await terminal.waitForRender();

		const overlay = new CountingComponent(["OVERLAY"]);
		tui.showOverlay(overlay);
		await terminal.waitForRender();
		const heavyBefore = heavy.renderCount;

		spinner.lines = ["spin-1"];
		tui.requestComponentRender(spinner);
		await terminal.waitForRender();
		assert.strictEqual(heavy.renderCount, heavyBefore + 1, "overlay frames must stay full compose");
		assert.strictEqual(spinner.renderCount, 3);
		tui.stop();
	});

	it("stays component-scoped when the host wraps requestRender with a microtask batcher", async () => {
		const terminal = new VirtualTerminal(40, 10);
		const tui = new TUI(terminal);
		// Mirror scream-code's renderBatcher: instance-level wrapper that
		// defers the original requestRender to a microtask. The wrapped call
		// must not wipe the component-scoped flag after it was set.
		const original = tui.requestRender.bind(tui);
		tui.requestRender = (force = false): void => {
			queueMicrotask(() => original(force));
		};
		const heavy = new CountingComponent(["heavy"]);
		const spinner = new CountingComponent(["spin-0"]);
		tui.addChild(heavy);
		tui.addChild(spinner);
		tui.start();
		await terminal.waitForRender();

		spinner.lines = ["spin-1"];
		tui.requestComponentRender(spinner);
		await terminal.waitForRender();
		assert.strictEqual(spinner.renderCount, 2);
		assert.strictEqual(heavy.renderCount, 1, "batcher-wrapped host must not break narrowing");
		assert.strictEqual(getScreenLines(terminal)[1], "spin-1");
		tui.stop();
	});

	it("reused rows keep the committed prefix seam intact across appends", async () => {
		const terminal = new VirtualTerminal(40, 5);
		const tui = new TUI(terminal);
		const transcript = new CountingComponent(["t0"]);
		const spinner = new CountingComponent(["spin"]);
		tui.addChild(transcript);
		tui.addChild(spinner);
		tui.start();
		await terminal.waitForRender();

		// Grow past the viewport so rows commit, then tick the spinner.
		for (let i = 1; i < 10; i++) {
			transcript.lines.push(`t${i}`);
			tui.requestRender();
			await terminal.waitForRender();
		}
		const transcriptRenders = transcript.renderCount;
		spinner.lines = ["spin*"];
		tui.requestComponentRender(spinner);
		await terminal.waitForRender();
		assert.strictEqual(transcript.renderCount, transcriptRenders, "committed transcript must be reused");

		const expected = [...transcript.lines, "spin*"].slice(-5);
		const screen = getScreenLines(terminal);
		for (let row = 0; row < 5; row++) {
			assert.strictEqual(screen[row]?.trimEnd(), (expected[row] ?? "").trimEnd(), `row ${row}`);
		}
		tui.stop();
	});
});
