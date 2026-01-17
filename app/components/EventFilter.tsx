"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./Button";

interface Event {
  id: string;
  name: string;
}

interface EventFilterProps {
  events: Event[];
  selectedEventIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
}

export function EventFilter({
  events,
  selectedEventIds,
  onSelectionChange,
}: EventFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1); // -1 = no focused option, 0+ = list items
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listItemRefs = useRef<Map<number, HTMLLabelElement>>(new Map());

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

  const allSelected = selectedEventIds.size === events.length;
  const noneSelected = selectedEventIds.size === 0;
  const someSelected = !allSelected && !noneSelected;

  const toggleAll = () => {
    if (selectedEventIds.size === 0) {
      // Check all - select everything (from full list, not filtered)
      onSelectionChange(new Set(events.map((evt) => evt.id)));
      return;
    }
    // Uncheck all - deselect everything
    onSelectionChange(new Set());
  };

  const toggleEvent = (eventId: string) => {
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
      if (focusedIndex < 0 && searchQuery.trim() === "") {
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

  const displayText = () => {
    if (noneSelected) {
      return `Event (0 of ${events.length})`;
    }
    if (allSelected) {
      return `Event (All ${events.length})`;
    }
    return `Event (${selectedEventIds.size} of ${events.length})`;
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
      {/* Filter Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant={someSelected || allSelected ? "selected" : "default"}
        size="sm"
        style={{
          fontWeight: someSelected || allSelected ? "var(--font-weight-bold)" : "var(--font-weight-normal)",
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>{displayText()}</span>
        <span style={{ fontSize: "var(--font-size-xs)" }}>{isOpen ? "▲" : "▼"}</span>
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: "var(--space-sm)",
            backgroundColor: "var(--surface-default)",
            border: "var(--border-width-thin) solid var(--border-secondary)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-dropdown)",
            minWidth: "280px",
            maxHeight: "420px",
            overflow: "hidden",
            zIndex: "var(--z-dropdown-panel)" as any,
            animation: "dropdownEnter 150ms var(--ease-out)",
          }}
        >
          <div
            role="listbox"
            aria-multiselectable="true"
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
                backgroundColor: "var(--bg-secondary)",
              }}
            >
            {/* Search Input */}
            <div
              style={{
                padding: "var(--space-md)",
                borderBottom: "var(--border-width-thin) solid var(--border-tertiary)",
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
                  padding: "10px 16px",
                  fontSize: "var(--font-size-sm)",
                  border: "var(--border-width-thin) solid var(--border-primary)",
                  borderRadius: "var(--radius-full)",
                  boxSizing: "border-box",
                  outline: "none",
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  transition: "all var(--transition-fast)",
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
                    marginTop: "var(--space-sm)",
                    paddingLeft: "var(--space-xs)",
                  }}
                >
                  Showing {filteredEvents.length} of {events.length} events
                </div>
              )}
            </div>

            {/* Select All Option */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px var(--space-md)",
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-semibold)",
                borderBottom: "var(--border-width-thin) solid var(--border-tertiary)",
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
                  width: "18px",
                  height: "18px",
                  accentColor: "var(--button-primary-bg)",
                }}
                aria-label="Select all events"
              />
              <span>All Events</span>
            </label>
          </div>

          {/* Individual Event Checkboxes */}
          {filteredEvents.length === 0 ? (
            <div
              style={{
                padding: "var(--space-lg) var(--space-md)",
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
                    padding: "10px var(--space-md)",
                    cursor: "pointer",
                    fontSize: "var(--font-size-sm)",
                    backgroundColor: isFocused ? "var(--interactive-focus-bg)" : isChecked ? "var(--interactive-selected)" : "var(--surface-default)",
                    color: "var(--text-primary)",
                    transition: "background-color var(--transition-fast)",
                    outline: isFocused ? "2px solid var(--interactive-focus)" : "none",
                    outlineOffset: "-2px",
                  }}
                  onMouseEnter={(e) => {
                    if (!isFocused) {
                      e.currentTarget.style.backgroundColor = isChecked ? "var(--interactive-selected-hover)" : "var(--interactive-hover)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isFocused) {
                      e.currentTarget.style.backgroundColor = isChecked ? "var(--interactive-selected)" : "var(--surface-default)";
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    tabIndex={-1}
                    onChange={() => toggleEvent(event.id)}
                    style={{
                      marginRight: "var(--space-sm)",
                      cursor: "pointer",
                      width: "18px",
                      height: "18px",
                      accentColor: "var(--button-primary-bg)",
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
              padding: "var(--space-md)",
              borderTop: "var(--border-width-thin) solid var(--border-tertiary)",
              backgroundColor: "var(--surface-default)",
              gap: "var(--space-sm)",
            }}
          >
              <Button
              onClick={() => {
                onSelectionChange(new Set());
              }}
              tabIndex={-1}
                variant="default"
                size="sm"
                style={{ flex: 1 }}
            >
              Clear
              </Button>
              <Button
              onClick={() => setIsOpen(false)}
              tabIndex={-1}
                variant="primary"
                size="sm"
                style={{ flex: 1 }}
            >
              Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
