"use client";

import { useId, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import { cn } from "@/lib/utils";

export interface ComboOption {
  value: string;
  label: string;
  keywords?: string[];
}

/** Searchable dropdown (shadcn pattern: Popover + cmdk). */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const selected = options.find((o) => o.value === value);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={ariaLabel}
          className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-[2px] border border-ink/20 bg-white px-4 py-3 text-left text-sm text-ink focus:border-gold focus:outline-none"
        >
          <span className={cn("truncate", !selected && "text-fog")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-fog" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[80] max-h-72 w-[var(--radix-popover-trigger-width)] overflow-hidden border border-ink/15 bg-white shadow-[0_24px_48px_-20px_rgba(28,25,23,0.4)]"
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} className="w-full border-b border-ink/10 px-4 py-3 text-sm focus:outline-none" />
            <div id={listId}>
            <CommandList className="max-h-56 overflow-y-auto p-1">
              <CommandEmpty className="px-4 py-6 text-center text-sm text-fog">{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem
                    key={o.value}
                    value={o.value}
                    keywords={o.keywords}
                    onSelect={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm text-espresso aria-selected:bg-sand data-[selected=true]:bg-sand"
                  >
                    <Check className={cn("size-4 shrink-0 text-gold", o.value === value ? "opacity-100" : "opacity-0")} />
                    {o.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            </div>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
