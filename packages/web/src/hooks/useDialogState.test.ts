import { renderHook, act } from "@testing-library/react";
import { useDialogState } from "./useDialogState";

describe("useDialogState", () => {
  it("Test 1 (initial state): all three booleans default to false", () => {
    const { result } = renderHook(() => useDialogState());

    expect(result.current.showImportDialog).toBe(false);
    expect(result.current.showLegendDialog).toBe(false);
    expect(result.current.showCopyForAIDialog).toBe(false);
  });

  it("Test 2 (setters toggle): calling setShowImportDialog(true) updates only showImportDialog", () => {
    const { result } = renderHook(() => useDialogState());

    act(() => {
      result.current.setShowImportDialog(true);
    });

    expect(result.current.showImportDialog).toBe(true);
    expect(result.current.showLegendDialog).toBe(false);
    expect(result.current.showCopyForAIDialog).toBe(false);
  });

  it("Test 3 (independence): setting one dialog state does not change another", () => {
    const { result } = renderHook(() => useDialogState());

    act(() => {
      result.current.setShowLegendDialog(true);
    });

    expect(result.current.showLegendDialog).toBe(true);
    expect(result.current.showImportDialog).toBe(false);
    expect(result.current.showCopyForAIDialog).toBe(false);

    act(() => {
      result.current.setShowCopyForAIDialog(true);
    });

    expect(result.current.showCopyForAIDialog).toBe(true);
    expect(result.current.showLegendDialog).toBe(true);
    expect(result.current.showImportDialog).toBe(false);
  });
});
