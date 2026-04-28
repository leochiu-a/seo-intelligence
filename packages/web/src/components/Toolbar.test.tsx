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
  it("renders File menu button", () => {
    render(<Toolbar {...defaultProps} />);
    expect(screen.getByRole("button", { name: /file/i })).toBeTruthy();
  });

  it("calls onClearCanvas when Clear Canvas is clicked in File menu and confirmed", () => {
    const onClearCanvas = vi.fn();
    render(<Toolbar {...defaultProps} onClearCanvas={onClearCanvas} />);
    fireEvent.click(screen.getByRole("button", { name: /file/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /clear canvas/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onClearCanvas).toHaveBeenCalledTimes(1);
  });

  it("disables Clear Canvas menu item when canvas is empty", () => {
    render(<Toolbar {...defaultProps} isEmpty={true} />);
    fireEvent.click(screen.getByRole("button", { name: /file/i }));
    const item = screen.getByRole("menuitem", { name: /clear canvas/i });
    expect(item.getAttribute("aria-disabled")).toBe("true");
  });

  it("enables Clear Canvas menu item when canvas has nodes", () => {
    render(<Toolbar {...defaultProps} isEmpty={false} />);
    fireEvent.click(screen.getByRole("button", { name: /file/i }));
    const item = screen.getByRole("menuitem", { name: /clear canvas/i });
    expect(item.getAttribute("aria-disabled")).not.toBe("true");
  });

  it("clicking Clear Canvas opens a confirmation dialog and does NOT call onClearCanvas", () => {
    const onClearCanvas = vi.fn();
    render(<Toolbar {...defaultProps} onClearCanvas={onClearCanvas} />);
    fireEvent.click(screen.getByRole("button", { name: /file/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /clear canvas/i }));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(onClearCanvas).toHaveBeenCalledTimes(0);
  });

  it("clicking Cancel in the dialog closes it without calling onClearCanvas", () => {
    const onClearCanvas = vi.fn();
    render(<Toolbar {...defaultProps} onClearCanvas={onClearCanvas} />);
    fireEvent.click(screen.getByRole("button", { name: /file/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /clear canvas/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClearCanvas).toHaveBeenCalledTimes(0);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("clicking the destructive confirm action calls onClearCanvas exactly once", () => {
    const onClearCanvas = vi.fn();
    render(<Toolbar {...defaultProps} onClearCanvas={onClearCanvas} />);
    fireEvent.click(screen.getByRole("button", { name: /file/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /clear canvas/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onClearCanvas).toHaveBeenCalledTimes(1);
  });
});

describe("Toolbar File dropdown — export & import", () => {
  it("test 1 — renders a File trigger button (no standalone Export JSON button)", () => {
    render(<Toolbar {...defaultProps} />);
    expect(screen.getByRole("button", { name: /file/i })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: /export json/i })).toBeNull();
  });

  it("test 2 — clicking File reveals Import JSON, Export JSON and Copy for AI menu items", () => {
    render(<Toolbar {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /file/i }));
    expect(screen.getByRole("menuitem", { name: /import json/i })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /export json/i })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /copy for ai/i })).toBeTruthy();
  });

  it("test 3 — clicking Export JSON calls onExportJson and closes the menu", () => {
    const onExportJson = vi.fn();
    render(<Toolbar {...defaultProps} onExportJson={onExportJson} />);
    fireEvent.click(screen.getByRole("button", { name: /file/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /export json/i }));
    expect(onExportJson).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menuitem", { name: /export json/i })).toBeNull();
  });

  it("test 4 — clicking Copy for AI calls onCopyForAI and closes the menu", () => {
    const onCopyForAI = vi.fn();
    render(<Toolbar {...defaultProps} onCopyForAI={onCopyForAI} />);
    fireEvent.click(screen.getByRole("button", { name: /file/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /copy for ai/i }));
    expect(onCopyForAI).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menuitem", { name: /copy for ai/i })).toBeNull();
  });

  it("test 5 — Export JSON and Copy for AI are disabled when isEmpty === true", () => {
    render(<Toolbar {...defaultProps} isEmpty={true} />);
    fireEvent.click(screen.getByRole("button", { name: /file/i }));
    expect(
      screen.getByRole("menuitem", { name: /export json/i }).getAttribute("aria-disabled"),
    ).toBe("true");
    expect(
      screen.getByRole("menuitem", { name: /copy for ai/i }).getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("test 6 — clicking outside the dropdown closes it", () => {
    render(<Toolbar {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /file/i }));
    expect(screen.getByRole("menuitem", { name: /export json/i })).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menuitem", { name: /export json/i })).toBeNull();
  });

  it("test 7 — clicking Import JSON calls onImportJson", () => {
    const onImportJson = vi.fn();
    render(<Toolbar {...defaultProps} onImportJson={onImportJson} />);
    fireEvent.click(screen.getByRole("button", { name: /file/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /import json/i }));
    expect(onImportJson).toHaveBeenCalledTimes(1);
  });
});
