import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Toolbar } from "./Toolbar";

const defaultProps = {
  onAddNode: vi.fn(),
  onImportJson: vi.fn(),
  onExportJson: vi.fn(),
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
