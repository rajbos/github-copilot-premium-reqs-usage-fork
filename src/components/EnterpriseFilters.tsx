import { useMemo, useRef, useState } from "react";
import { Download, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  EMPTY_LISTS, PROFILE_KEY, exportUsernameCSV, listsKey, normalizeUsername,
  parseUsernameCSV, readProfiles, readUserLists, uniqueUsernames,
  type EnterpriseProfile, type UserLists,
} from "@/lib/enterprise-filters";

interface EnterpriseFiltersProps {
  users: string[];
  activeProfile: string | null;
  lists: UserLists;
  onProfileChange: (id: string | null, lists: UserLists) => void;
  onListsChange: (lists: UserLists) => void;
  displayUser: (user: string) => string;
}

type ListName = keyof UserLists;

function loadProfiles(): { profiles: EnterpriseProfile[]; error: string; corrupt: boolean } {
  try {
    return { profiles: readProfiles(localStorage), error: "", corrupt: false };
  } catch (cause) {
    return {
      profiles: [],
      error: cause instanceof Error ? cause.message : "Could not read saved enterprise profiles.",
      corrupt: true,
    };
  }
}

export function EnterpriseFilters({
  users, activeProfile, lists, onProfileChange, onListsChange, displayUser,
}: EnterpriseFiltersProps) {
  const [initial] = useState(loadProfiles);
  const [profiles, setProfiles] = useState<EnterpriseProfile[]>(initial.profiles);
  const [error, setError] = useState(initial.error);
  const [profilesCorrupt, setProfilesCorrupt] = useState(initial.corrupt);
  const [listsCorrupt, setListsCorrupt] = useState(false);
  const [damagedProfileId, setDamagedProfileId] = useState<string | null>(null);
  const [newProfile, setNewProfile] = useState("");
  const [search, setSearch] = useState<Record<ListName, string>>({ cohort: "", excluded: "" });
  const [input, setInput] = useState<Record<ListName, string>>({ cohort: "", excluded: "" });
  const uploadRefs = {
    cohort: useRef<HTMLInputElement>(null),
    excluded: useRef<HTMLInputElement>(null),
  };
  const knownUsers = useMemo(() => new Map(users.map(user => [normalizeUsername(user), user])), [users]);

  function selectProfile(id: string) {
    if (!id) {
      onProfileChange(null, EMPTY_LISTS);
      setError("");
      setListsCorrupt(false);
      return;
    }
    try {
      const saved = readUserLists(localStorage, id);
      onProfileChange(id, saved);
      setListsCorrupt(false);
      setError("");
    } catch (cause) {
      onProfileChange(null, EMPTY_LISTS);
      setListsCorrupt(true);
      setDamagedProfileId(id);
      setError(cause instanceof Error ? cause.message : "Could not read saved user lists.");
    }
  }

  function createProfile() {
    const name = newProfile.trim();
    if (!name) { setError("Enter an enterprise profile name."); return; }
    if (profiles.some(profile => profile.name.toLowerCase() === name.toLowerCase())) {
      setError("That enterprise profile already exists. Select it instead.");
      return;
    }
    const profile = { id: crypto.randomUUID(), name };
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify([...profiles, profile]));
      setProfiles([...profiles, profile]);
      setNewProfile("");
      setError("");
      onProfileChange(profile.id, EMPTY_LISTS);
    } catch (cause) {
      setError(cause instanceof Error ? `Could not save profile: ${cause.message}` : "Could not save profile.");
    }
  }

  function updateList(name: ListName, values: string[]): boolean {
    if (!activeProfile) return false;
    const next = { ...lists, [name]: uniqueUsernames(values) };
    try {
      localStorage.setItem(listsKey(activeProfile), JSON.stringify(next));
      onListsChange(next);
      setError("");
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? `Could not save user lists: ${cause.message}` : "Could not save user lists.");
      return false;
    }
  }

  function addUser(name: ListName) {
    const username = normalizeUsername(input[name]);
    if (!username || /[\r\n,"]/.test(username)) {
      setError("Enter one username without commas, quotes, or line breaks.");
      return;
    }
    if (updateList(name, [...lists[name], username])) {
      setInput(previous => ({ ...previous, [name]: "" }));
    }
  }

  async function importList(name: ListName, file: File | undefined) {
    if (!file) return;
    try {
      const imported = parseUsernameCSV(await file.text());
      updateList(name, imported);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not import username CSV.");
    }
  }

  function downloadList(name: ListName) {
    const csv = exportUsernameCSV(lists[name]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}-users.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const selectedProfile = profiles.find(profile => profile.id === activeProfile);

  return (
    <Card className="mb-6">
      <div className="p-5 space-y-5">
        <div>
          <h2 className="text-xl font-semibold">Enterprise user filters</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose the enterprise for these CSV files. Exports do not identify an enterprise reliably; profile association is manual.
            Usernames and profile names are saved only in this browser. Usage rows are not saved.
          </p>
        </div>
        {error && <div role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
          {error}
          {profilesCorrupt && <Button type="button" variant="outline" size="sm" className="ml-3" onClick={() => {
            try {
              localStorage.removeItem(PROFILE_KEY);
              setProfiles([]);
              setProfilesCorrupt(false);
              setError("");
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Could not clear damaged profiles.");
            }
          }}>Clear damaged profiles</Button>}
          {listsCorrupt && <Button type="button" variant="outline" size="sm" className="ml-3" onClick={() => {
            const id = damagedProfileId;
            if (!id) return;
            try {
              localStorage.removeItem(listsKey(id));
              setListsCorrupt(false);
              setError("");
              onProfileChange(id, EMPTY_LISTS);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Could not reset damaged lists.");
            }
          }}>Reset damaged lists</Button>}
        </div>}
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium min-w-48 flex-1">
            Enterprise profile
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={activeProfile ?? ""}
              disabled={profilesCorrupt}
              onChange={event => selectProfile(event.target.value)}
            >
              <option value="">Select an enterprise...</option>
              {profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
          </label>
          <form className="flex flex-wrap items-end gap-2 flex-1" onSubmit={event => { event.preventDefault(); createProfile(); }}>
            <label className="flex flex-col gap-1 text-sm font-medium min-w-48 flex-1">
              New enterprise profile
              <Input value={newProfile} onChange={event => setNewProfile(event.target.value)} placeholder="Enterprise name" disabled={profilesCorrupt} />
            </label>
            <Button type="submit" variant="outline" disabled={profilesCorrupt}>Create profile</Button>
          </form>
        </div>
        {!selectedProfile ? (
          <p className="text-sm text-muted-foreground">
            No enterprise selected. Choose or create a profile to apply its saved cohort and exclusions to this upload.
          </p>
        ) : (
          <>
            <p className="text-sm">Using saved lists for <strong>{selectedProfile.name}</strong>. Switching profiles changes both lists immediately. Exclusions take precedence over cohort selections.</p>
            <div className="grid gap-6 lg:grid-cols-2">
              {(["cohort", "excluded"] as const).map(name => {
                const visible = lists[name].filter(user => displayUser(knownUsers.get(user) ?? user).toLowerCase().includes(search[name].toLowerCase()));
                const unknown = lists[name].filter(user => !knownUsers.has(user)).length;
                return <section key={name} className="min-w-0 space-y-3" aria-label={name === "cohort" ? "Cohort users" : "Excluded users"}>
                  <div>
                    <h3 className="font-semibold">{name === "cohort" ? "Cohort users" : "Excluded from overall"}</h3>
                    <p className="text-sm text-muted-foreground">{name === "cohort"
                      ? "Selected accounts to compare with the overall population."
                      : "Removed from overall, cohort, searches, charts, and dialogs."}</p>
                  </div>
                  <form className="flex gap-2" onSubmit={event => { event.preventDefault(); addUser(name); }}>
                    <label className="sr-only" htmlFor={`${name}-add`}>Add {name} username</label>
                    <Input id={`${name}-add`} list={`${name}-suggestions`} value={input[name]}
                      onChange={event => setInput(previous => ({ ...previous, [name]: event.target.value }))}
                      placeholder="Add username" />
                    <datalist id={`${name}-suggestions`}>{users.map(user => <option key={user} value={user} />)}</datalist>
                    <Button type="submit" variant="outline">Add</Button>
                  </form>
                  <label className="sr-only" htmlFor={`${name}-search`}>Search {name} list</label>
                  <Input id={`${name}-search`} type="search" value={search[name]}
                    onChange={event => setSearch(previous => ({ ...previous, [name]: event.target.value }))}
                    placeholder={`Search ${name} list`} />
                  <div className="max-h-48 overflow-auto border rounded-md p-2">
                    {visible.length ? <ul className="space-y-1">{visible.map(user =>
                      <li key={user} className="flex items-center justify-between gap-2 text-sm px-1">
                        <span className="truncate">{displayUser(knownUsers.get(user) ?? user)}{!knownUsers.has(user) && <span className="text-muted-foreground"> (not in upload)</span>}
                          {name === "cohort" && lists.excluded.includes(user) && <span className="text-muted-foreground"> (excluded)</span>}</span>
                        <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label={`Remove ${user} from ${name}`}
                          onClick={() => updateList(name, lists[name].filter(item => item !== user))}><X className="size-4" /></Button>
                      </li>)}</ul> : <p className="text-sm text-muted-foreground p-2">{search[name] ? "No matching usernames." : "No usernames yet. Add one or import a CSV."}</p>}
                  </div>
                  <p className="text-xs text-muted-foreground">{lists[name].length.toLocaleString()} saved · {unknown.toLocaleString()} not in this upload</p>
                  <div className="flex flex-wrap gap-2">
                    <input ref={uploadRefs[name]} type="file" accept=".csv,text/csv" className="sr-only"
                      aria-label={`Import ${name} usernames CSV`} onChange={event => {
                        void importList(name, event.target.files?.[0]);
                        event.target.value = "";
                      }} />
                    <Button type="button" size="sm" variant="outline" onClick={() => uploadRefs[name].current?.click()}><Upload className="size-4" /> Import CSV</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => downloadList(name)}><Download className="size-4" /> Export CSV</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">CSV requires a username header; import replaces this list. Duplicate names are merged.</p>
                </section>;
              })}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
