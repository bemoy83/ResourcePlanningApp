"use client";

import { useId, useState, useRef, useEffect } from "react";
import { Chip } from "./Chip";
import { Button } from "./Button";

interface Event {
  id: string;
  name: string;
}

interface EventFilterProps {
  events: Event[];
  selectedEventIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  selectionMode?: "multi" | "single";
  label?: string;
}

export function EventFilter({
  events,
  selectedEventIds,
  onSelectionChange,
  selectionMode = "multi",
  label = "Event",
}: EventFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listItemRefs = useRef<Map<number, HTMLLabelElement>>(new Map());
  const groupName = useId();
  const isSingleSelect = selectionMode === "single";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Focus search input when dropdown opens and reset focused index
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(-1);
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  // Clear search and reset focus when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0) {
      const item = listItemRefs.current.get(focusedIndex);
      if (item) {
        item.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [focusedIndex]);

  // Filter events based on search query
  const filteredEvents = events.filter((event) =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allSelected = !isSingleSelect && selectedEventIds.size === events.length && events.length > 0;
  const noneSelected = selectedEventIds.size === 0;
  const someSelected = !isSingleSelect && !allSelected && !noneSelected;

  const toggleAll = () => {
    if (isSingleSelect) {
      return;
    }
    if (selectedEventIds.size === 0) {
      // Check all - select everything (from full list, not filtered)
      onSelectionChange(new Set(events.map((evt) => evt.id)));
      return;
    }
    // Uncheck all - deselect everything
    onSelectionChange(new Set());
  };

  const toggleEvent = (eventId: string) => {
    if (isSingleSelect) {
      const shouldClear = selectedEventIds.has(eventId);
      onSelectionChange(shouldClear ? new Set() : new Set([eventId]));
      setIsOpen(false);
      return;
    }

    const newSelection = new Set(selectedEventIds);
    if (newSelection.has(eventId)) {
      newSelection.delete(eventId);
    } else {
      newSelection.add(eventId);
    }
    onSelectionChange(newSelection);
  };

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      setIsOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, filteredEvents.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!isSingleSelect && focusedIndex < 0 && searchQuery.trim() === "") {
        toggleAll();
        return;
      }
      const targetIndex = focusedIndex >= 0 ? focusedIndex : 0;
      const event = filteredEvents[targetIndex];
      if (event) {
        toggleEvent(event.id);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSearchQuery("");
      setFocusedIndex(-1);
      setIsOpen(false);
    }
  };

  const selectedEvent =
    selectedEventIds.size > 0
      ? events.find((event) => selectedEventIds.has(event.id)) ?? null
      : null;

  const displayText = () => {
    if (isSingleSelect) {
      if (!selectedEvent) {
        return `${label} (None)`;
      }
      return `${label}: ${selectedEvent.name}`;
    }
    if (noneSelected) {
      return `${label} (0 of ${events.length})`;
    }
    if (allSelected) {
      return `${label} (All ${events.length})`;
    }
    return `${label} (${selectedEventIds.size} of ${events.length})`;
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
      {/* Filter Button */}
      <Chip
        onClick={() => setIsOpen(!isOpen)}
        selected={isSingleSelect ? selectedEventIds.size > 0 : someSelected || allSelected}
        variant="segmented"
      >
        <span>{displayText()}</span>
        <span style={{ fontSize: "var(--font-size-xs)", marginLeft: "var(--space-xs)" }}>{isOpen ? "▲" : "▼"}</span>
      </Chip>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: "var(--space-xs)",
            backgroundColor: "var(--surface-default)",
            border: "var(--border-width-thin) solid var(--border-primary)",
            borderRadius: "var(--radius-lg)",
            minWidth: "280px",
            maxHeight: "420px",
            overflow: "hidden",
            zIndex: "var(--z-dropdown-panel)" as any,
          }}
        >
          <div
            role="listbox"
            aria-multiselectable={!isSingleSelect}
            onKeyDown={handleKeyDown}
            style={{
              maxHeight: "400px",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 1,
                backgroundColor: "var(--surface-default)",
              }}
            >
            {/* Search Input */}
            <div
              style={{
                  padding: "var(--space-sm)",
                backgroundColor: "var(--surface-default)",
              }}
            >
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: "var(--font-size-sm)",
                  border: "var(--border-width-thin) solid var(--border-primary)",
                  borderRadius: "var(--radius-full)",
                  boxSizing: "border-box",
                  outline: "none",
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  transition: "border-color var(--transition-fast)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--interactive-focus)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px var(--interactive-focus-bg)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-primary)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              {searchQuery && (
                <div
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--text-tertiary)",
                      marginTop: "var(--space-xs)",
                    paddingLeft: "var(--space-xs)",
                  }}
                >
                  Showing {filteredEvents.length} of {events.length} events
                </div>
              )}
            </div>

            {/* Select All Option */}
            {!isSingleSelect && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px var(--space-sm)",
                  cursor: "pointer",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-semibold)",
                  borderBottom: "var(--border-width-thin) solid var(--border-primary)",
                  backgroundColor: "var(--surface-default)",
                  color: "var(--text-primary)",
                }}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  tabIndex={-1}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = someSelected;
                    }
                  }}
                  onChange={toggleAll}
                  style={{
                    marginRight: "var(--space-sm)",
                    cursor: "pointer",
                    width: "16px",
                    height: "16px",
                  }}
                  aria-label="Select all events"
                />
                <span>All Events</span>
              </label>
            )}
          </div>

          {/* Individual Event Checkboxes */}
          {filteredEvents.length === 0 ? (
            <div
              style={{
                  padding: "var(--space-lg) var(--space-sm)",
                textAlign: "center",
                fontSize: "var(--font-size-sm)",
                color: "var(--text-tertiary)",
              }}
            >
              No events match &quot;{searchQuery}&quot;
            </div>
          ) : (
            filteredEvents.map((event, index) => {
              const isChecked = selectedEventIds.has(event.id);
              const isFocused = focusedIndex === index;
              return (
                <label
                  key={event.id}
                  ref={(el) => {
                    if (el) {
                      listItemRefs.current.set(index, el);
                    } else {
                      listItemRefs.current.delete(index);
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px var(--space-sm)",
                    cursor: "pointer",
                    fontSize: "var(--font-size-sm)",
                    backgroundColor: isFocused ? "var(--surface-hover)" : isChecked ? "var(--surface-hover)" : "var(--surface-default)",
                    color: "var(--text-primary)",
                    transition: "background-color var(--transition-fast)",
                    borderLeft: isChecked ? "2px solid var(--btn-selected-bg)" : "2px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--surface-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isChecked ? "var(--surface-hover)" : "var(--surface-default)";
                  }}
                >
                  <input
                    type={isSingleSelect ? "radio" : "checkbox"}
                    name={isSingleSelect ? groupName : undefined}
                    checked={isChecked}
                    tabIndex={-1}
                    onChange={() => toggleEvent(event.id)}
                    style={{
                      marginRight: "var(--space-sm)",
                      cursor: "pointer",
                      width: "16px",
                      height: "16px",
                    }}
                    aria-label={`Select ${event.name}`}
                  />
                  <span>{event.name}</span>
                </label>
              );
            })
          )}

          {/* Action Buttons */}
          <div
            style={{
              position: "sticky",
              bottom: 0,
              display: "flex",
              justifyContent: "space-between",
                padding: "var(--space-sm)",
                borderTop: "var(--border-width-thin) solid var(--border-primary)",
              backgroundColor: "var(--surface-default)",
              gap: "var(--space-sm)",
            }}
          >
              <Button
              onClick={() => {
                onSelectionChange(new Set());
              }}
              tabIndex={-1}
                variant="ghost"
                size="sm"
                style={{ flex: 1 }}
            >
              Clear
              </Button>
              <Button
              onClick={() => setIsOpen(false)}
              tabIndex={-1}
                variant="chip-selected"
                size="sm"
                style={{ flex: 1 }}
            >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
