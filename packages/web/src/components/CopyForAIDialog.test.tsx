import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { CopyForAIDialog } from "./CopyForAIDialog";

const defaultProps = { open: true, onClose: vi.fn(), text: "hello world" };

describe("CopyForAIDialog", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders preview text in textarea", () => {
    render(<CopyForAIDialog {...defaultProps} />);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("hello world");
  });

  it("Copy button calls clipboard.writeText and shows Copied!", async () => {
    render(<CopyForAIDialog {...defaultProps} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("hello world");
    expect(screen.getByText("Copied!")).toBeTruthy();
  });

  it("Copied! state resets after 1500 ms", async () => {
    render(<CopyForAIDialog {...defaultProps} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    });
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.queryByText("Copied!")).toBeNull();
  });

  it("Close button calls onClose", () => {
    const onClose = vi.fn();
    render(<CopyForAIDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("Close", { selector: "button" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("silent fallback when clipboard throws", async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("blocked"),
    );
    render(<CopyForAIDialog {...defaultProps} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    });
    expect(screen.queryByText("Copied!")).toBeNull();
  });
});
