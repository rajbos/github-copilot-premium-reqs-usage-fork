import React, { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CopilotUsageData } from "@/lib/utils";

interface UserSearchProps {
  data: CopilotUsageData[] | null;
  selectedUser: string | null;
  onUserChange: (user: string | null) => void;
  disabled?: boolean;
}

/**
 * User search component with autocomplete functionality
 * Allows searching and selecting any user from the dataset
 */
export function UserSearch({ 
  data, 
  selectedUser, 
  onUserChange, 
  disabled = false 
}: UserSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Get all unique users from the data
  const allUsers = useMemo(() => {
    if (!data || data.length === 0) return [];
    const uniqueUsers = Array.from(new Set(data.map(item => item.user)));
    return uniqueUsers.sort();
  }, [data]);

  // Filter users based on search input
  const filteredUsers = useMemo(() => {
    if (!searchValue) return allUsers;
    return allUsers.filter(user => 
      user.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [allUsers, searchValue]);

  const handleUserSelect = (user: string) => {
    onUserChange(user);
    setOpen(false);
    setSearchValue("");
  };

  const handleClearUser = () => {
    onUserChange(null);
    setSearchValue("");
  };

  const displayValue = selectedUser || "Search for a user...";

  return (
    <div className="flex items-center gap-3">
      <Search className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[300px] justify-between"
              disabled={disabled || !data || data.length === 0}
            >
              <span className={selectedUser ? "text-foreground" : "text-muted-foreground"}>
                {displayValue}
              </span>
              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput 
                placeholder="Search users..." 
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                {filteredUsers.length === 0 ? (
                  <CommandEmpty>No users found.</CommandEmpty>
                ) : (
                  <CommandGroup>
                    {filteredUsers.map((user) => (
                      <CommandItem
                        key={user}
                        value={user}
                        onSelect={() => handleUserSelect(user)}
                        className="cursor-pointer"
                      >
                        {user}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {selectedUser && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearUser}
            className="px-2"
            title="Clear selection"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {data && data.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {allUsers.length} users available
        </div>
      )}
    </div>
  );
}