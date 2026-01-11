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
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const allSelected = selectedLocationIds.size === locations.length;
  const noneSelected = selectedLocationIds.size === 0;
  const someSelected = !allSelected && !noneSelected;

  const toggleAll = () => {
    if (allSelected || noneSelected) {
      // Select all
      onSelectionChange(new Set(locations.map((loc) => loc.id)));
    } else {
      // Deselect all
      onSelectionChange(new Set());
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
          {locations.map((location) => {
            const isChecked = selectedLocationIds.has(location.id);
            return (
              <label
                key={location.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "12px",
                  backgroundColor: isChecked ? "#f0f0f0" : "#fff",
                  color: "#000",
                  borderBottom: "1px solid #eee",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isChecked ? "#e8e8e8" : "#f9f9f9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isChecked ? "#f0f0f0" : "#fff";
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
          })}

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
