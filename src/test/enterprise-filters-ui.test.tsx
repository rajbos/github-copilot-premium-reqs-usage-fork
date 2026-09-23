import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { EnterpriseFilters } from "@/components/EnterpriseFilters";
import { EMPTY_LISTS, PROFILE_KEY, listsKey, type UserLists } from "@/lib/enterprise-filters";

function FiltersHarness() {
  const [profile, setProfile] = useState<string | null>(null);
  const [lists, setLists] = useState<UserLists>(EMPTY_LISTS);
  return <EnterpriseFilters users={["Alice", "Bob", "Charlie"]} activeProfile={profile}
    lists={lists} onProfileChange={(id, saved) => { setProfile(id); setLists(saved); }}
    onListsChange={setLists} displayUser={user => user} />;
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("enterprise filter UI", () => {
  it("creates and switches independent profiles, adds/removes and imports usernames", async () => {
    render(<FiltersHarness />);
    expect(screen.getByText(/No enterprise selected/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("New enterprise profile"), { target: { value: "Enterprise A" } });
    fireEvent.click(screen.getByRole("button", { name: "Create profile" }));
    const aId = JSON.parse(localStorage.getItem(PROFILE_KEY)!)[0].id;
    const cohort = within(screen.getByRole("region", { name: "Cohort users" }));
    fireEvent.change(cohort.getByLabelText("Add cohort username"), { target: { value: "Alice" } });
    fireEvent.click(cohort.getByRole("button", { name: "Add" }));
    expect(JSON.parse(localStorage.getItem(listsKey(aId))!).cohort).toEqual(["alice"]);
    fireEvent.change(screen.getByLabelText("New enterprise profile"), { target: { value: "Enterprise B" } });
    fireEvent.click(screen.getByRole("button", { name: "Create profile" }));
    expect(cohort.getByText(/No usernames yet/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Enterprise profile"), { target: { value: aId } });
    expect(cohort.getByRole("button", { name: "Remove alice from cohort" })).toBeInTheDocument();
    const excluded = within(screen.getByRole("region", { name: "Excluded users" }));
    fireEvent.change(excluded.getByLabelText("Import excluded usernames CSV"), {
      target: { files: [new File(["username\nBob\nbob\nUnknown"], "excluded.csv", { type: "text/csv" })] },
    });
    await waitFor(() => expect(JSON.parse(localStorage.getItem(listsKey(aId))!).excluded).toEqual(["bob", "unknown"]));
    expect(excluded.getByText(/not in upload/)).toBeInTheDocument();
    fireEvent.change(excluded.getByLabelText("Search excluded list"), { target: { value: "bob" } });
    expect(excluded.queryByText(/Unknown/)).not.toBeInTheDocument();
    fireEvent.click(excluded.getByRole("button", { name: "Remove bob from excluded" }));
    expect(JSON.parse(localStorage.getItem(listsKey(aId))!).excluded).toEqual(["unknown"]);
  });

  it("makes corrupt saved lists visible and recoverable", () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify([{ id: "one", name: "One" }]));
    localStorage.setItem(listsKey("one"), "{not valid");
    render(<FiltersHarness />);
    fireEvent.change(screen.getByLabelText("Enterprise profile"), { target: { value: "one" } });
    expect(screen.getByRole("alert")).toHaveTextContent(/Could not read|Expected property|Unexpected token/);
    fireEvent.click(screen.getByRole("button", { name: "Reset damaged lists" }));
    expect(localStorage.getItem(listsKey("one"))).toBeNull();
    expect(screen.getByText(/Using saved lists for/)).toBeInTheDocument();
  });
});
