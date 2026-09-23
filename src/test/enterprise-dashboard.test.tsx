import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "@/App";

const csv = `"Timestamp","User","Model","Requests Used","Exceeds Monthly Quota","Total Monthly Quota"
"2026-06-01","Alice","gpt-4","120","False","300"
"2026-06-02","Bob","gpt-4","40","False","300"
"2026-07-01","Alice","gpt-4","4","False","300"
"2026-07-02","Bob","gpt-4","200","False","300"`;

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("enterprise dashboard", () => {
  it("does not bind uploaded rows to a saved enterprise without explicit selection, then filters comparison and plan", async () => {
    localStorage.setItem("copilot-enterprise-profiles-v1", JSON.stringify([{ id: "one", name: "One" }]));
    localStorage.setItem("copilot-enterprise-lists-v1:one", JSON.stringify({ cohort: ["alice"], excluded: ["bob"] }));
    const { container } = render(<App />);
    fireEvent.change(container.querySelector("#csv-upload")!, {
      target: { files: [new File([csv], "usage.csv", { type: "text/csv" })] },
    });
    await screen.findByText(/No enterprise selected/);
    const overall = within(screen.getByText("Overall population").parentElement!);
    expect(overall.getByText(/2 active users/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Enterprise profile"), { target: { value: "one" } });
    await waitFor(() => expect(overall.getByText(/1 active users/)).toBeInTheDocument());
    expect(within(screen.getByText("Selected cohort").parentElement!).getByText(/4 requests/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Copilot plan"), { target: { value: "Enterprise" } });
    expect(screen.getByLabelText("Copilot plan")).toHaveValue("Enterprise");
    fireEvent.click(screen.getByRole("button", { name: /Upload New Files/ }));
    expect(screen.getByText("Upload CSV Files")).toBeInTheDocument();
    fireEvent.change(container.querySelector("#csv-upload")!, {
      target: { files: [new File([csv], "other-enterprise.csv", { type: "text/csv" })] },
    });
    await screen.findByText(/No enterprise selected/);
    expect(within(screen.getByText("Overall population").parentElement!).getByText(/2 active users/)).toBeInTheDocument();
  });
});
