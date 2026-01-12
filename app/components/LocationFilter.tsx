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
  const [focusedIndex, setFocusedIndex] = useState(-1); // -1 = search input, 0+ = list items
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
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
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
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, filteredLocations.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, -1));
      if (focusedIndex === 0) {
        // Going back to search input
        searchInputRef.current?.focus();
      }
    } else if (e.key === "Enter" && focusedIndex >= 0) {
      e.preventDefault();
      const location = filteredLocations[focusedIndex];
      if (location) {
        toggleLocation(location.id);
      }
    } else if (e.key === "Escape") {
      if (searchQuery) {
        e.preventDefault();
        setSearchQuery("");
        setFocusedIndex(-1);
        searchInputRef.current?.focus();
      } else {
        setIsOpen(false);
      }
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
          padding: "8px 12px",
          backgroundColor: someSelected || allSelected ? "#e0e0e0" : "#fff",
          border: "2px solid #666",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: someSelected || allSelected ? "bold" : "normal",
          color: "#000",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>{displayText()}</span>
        <span style={{ fontSize: "10px" }}>{isOpen ? "▲" : "▼"}</span>
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
            marginTop: "4px",
            backgroundColor: "#fff",
            border: "2px solid #666",
            borderRadius: "4px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
            minWidth: "250px",
            maxHeight: "400px",
            overflowY: "auto",
            zIndex: 1000,
          }}
        >
          {/* Search Input */}
          <div
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid #ccc",
              backgroundColor: "#fafafa",
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
                padding: "6px 8px",
                fontSize: "12px",
                border: "1px solid #999",
                borderRadius: "3px",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
            {searchQuery && (
              <div
                style={{
                  fontSize: "10px",
                  color: "#666",
                  marginTop: "4px",
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
              padding: "10px 12px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
              borderBottom: "1px solid #ccc",
              backgroundColor: "#f5f5f5",
              color: "#000",
            }}
          >
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) {
                  input.indeterminate = someSelected;
                }
              }}
              onChange={toggleAll}
              style={{
                marginRight: "8px",
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
                padding: "16px 12px",
                textAlign: "center",
                fontSize: "12px",
                color: "#666",
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
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: "12px",
                    backgroundColor: isFocused ? "#d0e8ff" : isChecked ? "#f0f0f0" : "#fff",
                    color: "#000",
                    borderBottom: "1px solid #eee",
                    outline: isFocused ? "2px solid #0066cc" : "none",
                    outlineOffset: "-2px",
                  }}
                  onMouseEnter={(e) => {
                    if (!isFocused) {
                      e.currentTarget.style.backgroundColor = isChecked ? "#e8e8e8" : "#f9f9f9";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isFocused) {
                      e.currentTarget.style.backgroundColor = isChecked ? "#f0f0f0" : "#fff";
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleLocation(location.id)}
                    style={{
                      marginRight: "8px",
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
              padding: "8px 12px",
              borderTop: "1px solid #ccc",
              backgroundColor: "#f5f5f5",
              gap: "8px",
            }}
          >
            <button
              onClick={() => {
                onSelectionChange(new Set());
              }}
              style={{
                padding: "6px 12px",
                backgroundColor: "#fff",
                border: "1px solid #999",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "11px",
                color: "#000",
                flex: 1,
              }}
            >
              Clear
            </button>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                padding: "6px 12px",
                backgroundColor: "#333",
                border: "1px solid #000",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "11px",
                color: "#fff",
                fontWeight: "bold",
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
