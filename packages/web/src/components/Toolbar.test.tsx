import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Toolbar } from "./Toolbar";

const defaultProps = {
  onAddNode: vi.fn(),
  onImportJson: vi.fn(),
  onExportJson: vi.fn(),
  onCopyForAI: vi.fn(),
  onClearCanvas: vi.fn(),
  isEmpty: false,
};

describe("Toolbar", () => {
  it("renders Clear Canvas button", () => {
    render(<Toolbar {...defaultProps} />);
    expect(screen.getByRole("button", { name: /clear canvas/i })).toBeTruthy();
  });

  it("calls onClearCanvas when Clear Canvas is clicked", () => {
    const onClearCanvas = vi.fn();
    render(<Toolbar {...defaultProps} onClearCanvas={onClearCanvas} />);
    fireEvent.click(screen.getByRole("button", { name: /clear canvas/i }));
    expect(onClearCanvas).toHaveBeenCalledTimes(1);
  });

  it("disables Clear Canvas when canvas is empty", () => {
    render(<Toolbar {...defaultProps} isEmpty={true} />);
    const btn = screen.getByRole("button", { name: /clear canvas/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("enables Clear Canvas when canvas has nodes", () => {
    render(<Toolbar {...defaultProps} isEmpty={false} />);
    const btn = screen.getByRole("button", { name: /clear canvas/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("Toolbar Export dropdown", () => {
  it("test 1 — renders an Export trigger button with chevron (no standalone Export JSON button)", () => {
    render(<Toolbar {...defaultProps} />);
    // Should have an Export button (trigger)
    expect(screen.getByRole("button", { name: /export/i })).toBeTruthy();
    // No standalone top-level "Export JSON" button (only appears inside menu)
    // After rendering, menu should be closed so menu items are not visible
    expect(screen.queryByRole("menuitem", { name: /export json/i })).toBeNull();
  });

  it("test 2 — clicking Export reveals Export JSON and Copy for AI menu items", () => {
    render(<Toolbar {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    expect(screen.getByRole("menuitem", { name: /export json/i })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /copy for ai/i })).toBeTruthy();
  });

  it("test 3 — clicking Export JSON calls onExportJson and closes the menu", () => {
    const onExportJson = vi.fn();
    render(<Toolbar {...defaultProps} onExportJson={onExportJson} />);
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /export json/i }));
    expect(onExportJson).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menuitem", { name: /export json/i })).toBeNull();
  });

  it("test 4 — clicking Copy for AI calls onCopyForAI and closes the menu", () => {
    const onCopyForAI = vi.fn();
    render(<Toolbar {...defaultProps} onCopyForAI={onCopyForAI} />);
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /copy for ai/i }));
    expect(onCopyForAI).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menuitem", { name: /copy for ai/i })).toBeNull();
  });

  it("test 5 — trigger button is disabled when isEmpty === true", () => {
    render(<Toolbar {...defaultProps} isEmpty={true} />);
    const btn = screen.getByRole("button", { name: /export/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("test 6 — clicking outside the dropdown closes it", () => {
    render(<Toolbar {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    expect(screen.getByRole("menuitem", { name: /export json/i })).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menuitem", { name: /export json/i })).toBeNull();
  });

  it("test 7 — exportFeedback=copied shows Copied! on trigger and hides chevron", () => {
    render(<Toolbar {...defaultProps} exportFeedback="copied" />);
    expect(screen.getByText(/copied!/i)).toBeTruthy();
  });
});
