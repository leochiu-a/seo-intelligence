import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScenarioTabBar } from "./ScenarioTabBar";
import type { ScenarioRecord } from "../lib/scenario-types";

const makeScenario = (id: string, name: string): ScenarioRecord => ({
  id,
  name,
  nodes: [],
  edges: [],
});

const defaultScenarios: ScenarioRecord[] = [
  makeScenario("s1", "Scenario 1"),
  makeScenario("s2", "Scenario 2"),
];

const defaultProps = {
  scenarios: defaultScenarios,
  activeId: "s1",
  onSwitch: vi.fn(),
  onAdd: vi.fn(),
  onRename: vi.fn(),
  onDelete: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ScenarioTabBar", () => {
  it("renders one tab per scenario with scenario names as text content", () => {
    render(<ScenarioTabBar {...defaultProps} />);
    expect(screen.getByText("Scenario 1")).toBeInTheDocument();
    expect(screen.getByText("Scenario 2")).toBeInTheDocument();
  });

  it("active tab has the font-semibold class", () => {
    render(<ScenarioTabBar {...defaultProps} />);
    // The active tab button (s1) should have font-semibold
    // The tab itself — find the first button whose text content is 'Scenario 1'
    const allButtons = screen.getAllByRole("button");
    const tabButton = allButtons.find(
      (b) => b.textContent?.includes("Scenario 1") && b.className.includes("font-semibold"),
    );
    expect(tabButton).toBeTruthy();
    expect(tabButton?.className).toContain("font-semibold");
  });

  it("clicking an inactive tab calls onSwitch with that scenario id", () => {
    render(<ScenarioTabBar {...defaultProps} />);
    // Find the tab button for Scenario 2 (inactive)
    const allButtons = screen.getAllByRole("button");
    const inactiveTab = allButtons.find(
      (b) => b.textContent?.includes("Scenario 2") && !b.className.includes("font-semibold"),
    );
    expect(inactiveTab).toBeTruthy();
    fireEvent.click(inactiveTab!);
    expect(defaultProps.onSwitch).toHaveBeenCalledWith("s2");
  });

  it('[+] button exists with aria-label "New scenario"', () => {
    render(<ScenarioTabBar {...defaultProps} />);
    expect(screen.getByRole("button", { name: "New scenario" })).toBeInTheDocument();
  });

  it("clicking [+] shows blank/clone prompt", () => {
    render(<ScenarioTabBar {...defaultProps} />);
    const addButton = screen.getByRole("button", { name: "New scenario" });
    fireEvent.click(addButton);
    expect(screen.getByText("Blank")).toBeInTheDocument();
    expect(screen.getByText("Clone Current")).toBeInTheDocument();
  });

  it('clicking Blank calls onAdd with "blank"', () => {
    render(<ScenarioTabBar {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "New scenario" }));
    fireEvent.click(screen.getByText("Blank"));
    expect(defaultProps.onAdd).toHaveBeenCalledWith("blank");
  });

  it('clicking Clone Current calls onAdd with "clone"', () => {
    render(<ScenarioTabBar {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "New scenario" }));
    fireEvent.click(screen.getByText("Clone Current"));
    expect(defaultProps.onAdd).toHaveBeenCalledWith("clone");
  });

  it("delete button is disabled when only 1 scenario", () => {
    const singleScenario = [makeScenario("s1", "Scenario 1")];
    render(<ScenarioTabBar {...defaultProps} scenarios={singleScenario} activeId="s1" />);
    // Open gear menu
    const gearButton = screen.getByRole("button", { name: /options for scenario 1/i });
    fireEvent.click(gearButton);
    // Find Delete button and check disabled
    const deleteButton = screen.getByRole("button", { name: /delete/i });
    expect(deleteButton).toBeDisabled();
  });

  it("delete button is enabled when 2+ scenarios", () => {
    render(<ScenarioTabBar {...defaultProps} />);
    // Open gear menu on first tab
    const gearButtons = screen.getAllByRole("button", { name: /options for/i });
    fireEvent.click(gearButtons[0]);
    const deleteButton = screen.getByRole("button", { name: /delete/i });
    expect(deleteButton).not.toBeDisabled();
  });

  it("clicking delete calls onDelete with the scenario id", () => {
    render(<ScenarioTabBar {...defaultProps} />);
    const gearButtons = screen.getAllByRole("button", { name: /options for/i });
    fireEvent.click(gearButtons[0]);
    const deleteButton = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteButton);
    expect(defaultProps.onDelete).toHaveBeenCalledWith("s1");
  });

  it("clicking Rename puts tab into edit mode with an input", () => {
    render(<ScenarioTabBar {...defaultProps} />);
    const gearButton = screen.getAllByRole("button", { name: /options for/i })[0];
    fireEvent.click(gearButton);
    fireEvent.click(screen.getByRole("button", { name: /rename/i }));
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe("Scenario 1");
  });

  it("pressing Enter on rename input calls onRename with new name", () => {
    render(<ScenarioTabBar {...defaultProps} />);
    const gearButton = screen.getAllByRole("button", { name: /options for/i })[0];
    fireEvent.click(gearButton);
    fireEvent.click(screen.getByRole("button", { name: /rename/i }));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "My Scenario" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(defaultProps.onRename).toHaveBeenCalledWith("s1", "My Scenario");
  });
});
