"use client";

import { useState, useRef, useEffect } from "react";

interface Location {
  id: string;
  name: string;
}

interface LocationFilterProps {
  locations: Location[];
  selectedLocationIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
}

export function LocationFilter({
  locations,
  selectedLocationIds,
  onSelectionChange,
}: LocationFilterProps) {
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

  // Filter locations based on search query
  const filteredLocations = locations
    .filter((location) =>
      location.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const allSelected = selectedLocationIds.size === locations.length;
  const noneSelected = selectedLocationIds.size === 0;
  const someSelected = !allSelected && !noneSelected;

  const toggleAll = () => {
    if (allSelected) {
      // Uncheck all - deselect everything
      onSelectionChange(new Set());
    } else {
      // Check all - select everything (from full list, not filtered)
      onSelectionChange(new Set(locations.map((loc) => loc.id)));
    }
  };

  const toggleLocation = (locationId: string) => {
    const newSelection = new Set(selectedLocationIds);
    if (newSelection.has(locationId)) {
      newSelection.delete(locationId);
    } else {
      newSelection.add(locationId);
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
      setFocusedIndex((prev) => Math.min(prev + 1, filteredLocations.length - 1));
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
      const location = filteredLocations[targetIndex];
      if (location) {
        toggleLocation(location.id);
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
      return `Location (0 of ${locations.length})`;
    }
    if (allSelected) {
      return `Location (All ${locations.length})`;
    }
    return `Location (${selectedLocationIds.size} of ${locations.length})`;
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "var(--space-sm) var(--space-md)",
          backgroundColor: someSelected || allSelected ? "var(--interactive-active)" : "var(--surface-default)",
          border: "var(--border-width-medium) solid var(--border-strong)",
          borderRadius: "var(--radius-md)",
          cursor: "pointer",
          fontSize: "var(--font-size-sm)",
          fontWeight: someSelected || allSelected ? "var(--font-weight-bold)" : "var(--font-weight-normal)",
          color: "var(--text-primary)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>{displayText()}</span>
        <span style={{ fontSize: "var(--font-size-xs)" }}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable="true"
          onKeyDown={handleKeyDown}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: "var(--space-xs)",
            backgroundColor: "var(--surface-default)",
            border: "var(--border-width-medium) solid var(--border-strong)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-dropdown)",
            minWidth: "250px",
            maxHeight: "400px",
            overflowY: "auto",
            zIndex: "var(--z-dropdown-panel)" as any,
          }}
        >
          {/* Search Input */}
          <div
            style={{
              padding: "var(--space-sm) var(--space-md)",
              borderBottom: "var(--border-width-thin) solid var(--border-secondary)",
              backgroundColor: "var(--bg-secondary)",
            }}
          >
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search locations..."
              style={{
                width: "100%",
                padding: "6px var(--space-sm)",
                fontSize: "var(--font-size-sm)",
                border: "var(--border-width-thin) solid var(--border-primary)",
                borderRadius: "var(--radius-xs)",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
            {searchQuery && (
              <div
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-tertiary)",
                  marginTop: "var(--space-xs)",
                }}
              >
                Showing {filteredLocations.length} of {locations.length} locations
              </div>
            )}
          </div>

          {/* Select All Option */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px var(--space-md)",
              cursor: "pointer",
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-bold)",
              borderBottom: "var(--border-width-thin) solid var(--border-secondary)",
              backgroundColor: "var(--bg-tertiary)",
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
              aria-label="Select all locations"
            />
            <span>All Locations</span>
          </label>

          {/* Individual Location Checkboxes */}
          {filteredLocations.length === 0 ? (
            <div
              style={{
                padding: "var(--space-lg) var(--space-md)",
                textAlign: "center",
                fontSize: "var(--font-size-sm)",
                color: "var(--text-tertiary)",
              }}
            >
              No locations match &quot;{searchQuery}&quot;
            </div>
          ) : (
            filteredLocations.map((location, index) => {
              const isChecked = selectedLocationIds.has(location.id);
              const isFocused = focusedIndex === index;
              return (
                <label
                  key={location.id}
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
                    padding: "var(--space-sm) var(--space-md)",
                    cursor: "pointer",
                    fontSize: "var(--font-size-sm)",
                    backgroundColor: isFocused ? "var(--interactive-focus-bg)" : isChecked ? "var(--interactive-selected)" : "var(--surface-default)",
                    color: "var(--text-primary)",
                    borderBottom: "var(--border-width-thin) solid var(--border-tertiary)",
                    outline: isFocused ? "var(--border-width-medium) solid var(--interactive-focus)" : "none",
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
                    onChange={() => toggleLocation(location.id)}
                    style={{
                      marginRight: "var(--space-sm)",
                      cursor: "pointer",
                      width: "16px",
                      height: "16px",
                    }}
                    aria-label={`Select ${location.name}`}
                  />
                  <span>{location.name}</span>
                </label>
              );
            })
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "var(--space-sm) var(--space-md)",
              borderTop: "var(--border-width-thin) solid var(--border-secondary)",
              backgroundColor: "var(--bg-tertiary)",
              gap: "var(--space-sm)",
            }}
          >
            <button
              onClick={() => {
                onSelectionChange(new Set());
              }}
              tabIndex={-1}
              style={{
                padding: "6px var(--space-md)",
                backgroundColor: "var(--surface-default)",
                border: "var(--border-width-thin) solid var(--border-primary)",
                borderRadius: "var(--radius-xs)",
                cursor: "pointer",
                fontSize: "var(--font-size-xs-sm)",
                color: "var(--text-primary)",
                flex: 1,
              }}
            >
              Clear
            </button>
            <button
              onClick={() => setIsOpen(false)}
              tabIndex={-1}
              style={{
                padding: "6px var(--space-md)",
                backgroundColor: "var(--button-primary-bg)",
                border: "var(--border-width-thin) solid var(--button-primary-border)",
                borderRadius: "var(--radius-xs)",
                cursor: "pointer",
                fontSize: "var(--font-size-xs-sm)",
                color: "var(--text-inverse)",
                fontWeight: "var(--font-weight-bold)",
                flex: 1,
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
