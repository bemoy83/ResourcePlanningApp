"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "./Button";

interface Location {
  id: string;
  name: string;
}

interface LocationTagGroup {
  name: string;
  locationIds: string[];
}

interface TagStore {
  tags: string[];
  byTag: Record<string, string[]>;
}

const STORAGE_KEY = "planning.location-tags.v1";
const TAG_NAME_MAX_LENGTH = 50;

interface LocationFilterProps {
  locations: Location[];
  selectedLocationIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  onTagsChange?: (groups: LocationTagGroup[]) => void;
}

export function LocationFilter({
  locations,
  selectedLocationIds,
  onSelectionChange,
  onTagsChange,
}: LocationFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1); // -1 = no focused option, 0+ = list items
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listItemRefs = useRef<Map<number, HTMLLabelElement>>(new Map());
  const [newTagName, setNewTagName] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagStore, setTagStore] = useState<TagStore>(() => {
    if (typeof window === "undefined") {
      return { tags: [], byTag: {} };
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { tags: [], byTag: {} };
      }
      const parsed = JSON.parse(raw) as TagStore;
      if (!parsed || !Array.isArray(parsed.tags) || typeof parsed.byTag !== "object") {
        return { tags: [], byTag: {} };
      }
      const sanitizedByTag: Record<string, string[]> = {};
      for (const tag of parsed.tags) {
        if (typeof tag !== "string") continue;
        const ids = parsed.byTag?.[tag];
        sanitizedByTag[tag] = Array.isArray(ids)
          ? ids.filter((id) => typeof id === "string")
          : [];
      }
      return { tags: parsed.tags.filter((tag) => typeof tag === "string"), byTag: sanitizedByTag };
    } catch {
      return { tags: [], byTag: {} };
    }
  });

  const locationIdSet = useMemo(() => new Set(locations.map((loc) => loc.id)), [locations]);
  const tagsByLocationId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const tag of tagStore.tags) {
      const ids = tagStore.byTag[tag] || [];
      for (const id of ids) {
        if (!map.has(id)) {
          map.set(id, []);
        }
        map.get(id)!.push(tag);
      }
    }
    for (const [, tags] of map) {
      tags.sort((a, b) => a.localeCompare(b));
    }
    return map;
  }, [tagStore]);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const tagGroups = useMemo<LocationTagGroup[]>(() => {
    return tagStore.tags.map((tag) => {
      const ids = (tagStore.byTag[tag] || []).filter((id) => locationIdSet.has(id));
      return { name: tag, locationIds: ids };
    });
  }, [tagStore, locationIdSet]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tagStore));
    } catch {
      // Ignore storage errors for private browsing or blocked storage.
    }
  }, [tagStore]);

  useEffect(() => {
    if (onTagsChange) {
      onTagsChange(tagGroups);
    }
  }, [onTagsChange, tagGroups]);

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
      setNewTagName("");
      setTagError(null);
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
    if (selectedLocationIds.size === 0) {
      // Check all - select everything (from full list, not filtered)
      onSelectionChange(new Set(locations.map((loc) => loc.id)));
      return;
    }
    // Uncheck all - deselect everything
    onSelectionChange(new Set());
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

  const handleAddTag = () => {
    const trimmedName = newTagName.trim();
    if (!trimmedName) {
      setTagError("Tag name cannot be empty.");
      return;
    }
    if (trimmedName.length > TAG_NAME_MAX_LENGTH) {
      setTagError(`Tag name must be ${TAG_NAME_MAX_LENGTH} characters or fewer.`);
      return;
    }
    const existingTag = tagStore.tags.find(
      (tag) => tag.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingTag) {
      setTagError("Tag name already exists.");
      return;
    }
    setTagStore((prev) => ({
      tags: [...prev.tags, trimmedName],
      byTag: { ...prev.byTag, [trimmedName]: [] },
    }));
    setNewTagName("");
    setTagError(null);
  };

  const handleRemoveTag = (tagName: string) => {
    setTagStore((prev) => {
      const nextTags = prev.tags.filter((tag) => tag !== tagName);
      const nextByTag = { ...prev.byTag };
      delete nextByTag[tagName];
      return { tags: nextTags, byTag: nextByTag };
    });
  };

  const handleAssignSelectedToTag = (tagName: string) => {
    if (selectedLocationIds.size === 0) return;
    setTagStore((prev) => {
      const existing = new Set(prev.byTag[tagName] || []);
      for (const id of selectedLocationIds) {
        existing.add(id);
      }
      return {
        ...prev,
        byTag: { ...prev.byTag, [tagName]: Array.from(existing) },
      };
    });
  };

  const handleRemoveSelectedFromTag = (tagName: string) => {
    if (selectedLocationIds.size === 0) return;
    setTagStore((prev) => {
      const current = prev.byTag[tagName] || [];
      const nextIds = current.filter((id) => !selectedLocationIds.has(id));
      return {
        ...prev,
        byTag: { ...prev.byTag, [tagName]: nextIds },
      };
    });
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

  const selectedLocationCount = selectedLocationIds.size;

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
            width: tagsExpanded ? "520px" : "280px",
            maxWidth: "90vw",
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
                placeholder="Search locations..."
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
                  Showing {filteredLocations.length} of {locations.length} locations
                </div>
              )}
            </div>

            {/* Select All Option */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px var(--space-md)",
                borderBottom: "var(--border-width-thin) solid var(--border-tertiary)",
                backgroundColor: "var(--surface-default)",
                color: "var(--text-primary)",
                gap: "var(--space-sm)",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-semibold)",
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
                  aria-label="Select all locations"
                />
                <span>All Locations</span>
              </label>
              <button
                type="button"
                onClick={() => setTagsExpanded((prev) => !prev)}
                tabIndex={-1}
                style={{
                  border: "none",
                  background: "var(--bg-tertiary)",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-full)",
                  cursor: "pointer",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-secondary)",
                  transition: "all var(--transition-fast)",
                }}
                aria-label={tagsExpanded ? "Collapse tags" : "Expand tags"}
              >
                Tags {tagsExpanded ? "▾" : "▸"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", width: "100%", flexWrap: "wrap" }}>
            {/* Location column */}
            <div
              style={{
                flex: tagsExpanded ? "1 1 260px" : "1 1 100%",
                minWidth: "240px",
              }}
            >
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
                    onChange={() => toggleLocation(location.id)}
                    style={{
                      marginRight: "var(--space-sm)",
                      cursor: "pointer",
                      width: "18px",
                      height: "18px",
                      accentColor: "var(--button-primary-bg)",
                    }}
                    aria-label={`Select ${location.name}`}
                  />
                  <span style={{ flex: "1 1 auto", minWidth: 0 }}>{location.name}</span>
                  {tagsByLocationId.has(location.id) && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "var(--space-xxs)",
                        marginLeft: "var(--space-sm)",
                        justifyContent: "flex-end",
                        flex: "0 0 auto",
                      }}
                    >
                      {(() => {
                        const tags = tagsByLocationId.get(location.id)!;
                        const visibleTags = tags.slice(0, 3);
                        const overflowCount = tags.length - visibleTags.length;
                        return (
                          <>
                            {visibleTags.map((tag) => (
                              <span
                                key={tag}
                                style={{
                                  fontSize: "10px",
                                  padding: "2px 6px",
                                  borderRadius: "999px",
                                  border: "var(--border-width-thin) solid var(--border-tertiary)",
                                  backgroundColor: "var(--surface-default)",
                                  color: "var(--text-tertiary)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                            {overflowCount > 0 && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  padding: "2px 6px",
                                  borderRadius: "999px",
                                  border: "var(--border-width-thin) dashed var(--border-tertiary)",
                                  backgroundColor: "var(--bg-secondary)",
                                  color: "var(--text-tertiary)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                +{overflowCount}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </label>
              );
            })
          )}
            </div>

            {/* Tags column */}
            {tagsExpanded ? (
              <div
                style={{
                  flex: "1 1 220px",
                  minWidth: "200px",
                  padding: "var(--space-sm)",
                  borderLeft: "var(--border-width-thin) solid var(--border-secondary)",
                  backgroundColor: "var(--bg-secondary)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-sm)",
                }}
              >
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>
                  Use selected locations to add or remove tags.
                </div>
                <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                  <input
                    type="text"
                    value={newTagName}
                    tabIndex={-1}
                    placeholder="New tag"
                    onChange={(e) => {
                      setNewTagName(e.target.value);
                      if (tagError) {
                        setTagError(null);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddTag();
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: "6px var(--space-sm)",
                      fontSize: "var(--font-size-xs-sm)",
                      border: "var(--border-width-thin) solid var(--border-primary)",
                      borderRadius: "var(--radius-xs)",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    onClick={handleAddTag}
                    tabIndex={-1}
                    disabled={newTagName.trim().length === 0}
                    style={{
                      padding: "6px var(--space-sm)",
                      backgroundColor: "var(--surface-default)",
                      border: "var(--border-width-thin) solid var(--border-primary)",
                      borderRadius: "var(--radius-xs)",
                      cursor: newTagName.trim().length === 0 ? "not-allowed" : "pointer",
                      fontSize: "var(--font-size-xs-sm)",
                      color: "var(--text-primary)",
                      opacity: newTagName.trim().length === 0 ? 0.6 : 1,
                    }}
                  >
                    Add
                  </button>
                </div>
                {tagError && (
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--status-error)" }}>
                    {tagError}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
                  {tagGroups.length === 0 ? (
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>
                      No tags yet.
                    </div>
                  ) : (
                    tagGroups.map((tag) => {
                      const tagCount = tag.locationIds.length;
                      const isTagSelected =
                        tagCount > 0 &&
                        selectedLocationIds.size === tagCount &&
                        tag.locationIds.every((id) => selectedLocationIds.has(id));
                      return (
                        <div
                          key={tag.name}
                          style={{
                            border: "var(--border-width-thin) solid var(--border-secondary)",
                            borderRadius: "var(--radius-sm)",
                            padding: "var(--space-xs)",
                            backgroundColor: isTagSelected ? "var(--interactive-selected)" : "var(--interactive-hover)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "var(--space-xxs)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-xs)" }}>
                            <span style={{ fontSize: "var(--font-size-xs-sm)", fontWeight: "var(--font-weight-bold)", color: "var(--text-primary)", wordBreak: "break-word" }}>
                              {tag.name}
                            </span>
                            <button
                              onClick={() => handleRemoveTag(tag.name)}
                              tabIndex={-1}
                              style={{
                                padding: "2px var(--space-xs)",
                                backgroundColor: "transparent",
                                border: "var(--border-width-thin) solid var(--border-tertiary)",
                                borderRadius: "var(--radius-xs)",
                                cursor: "pointer",
                                fontSize: "10px",
                                color: "var(--text-tertiary)",
                              }}
                            >
                              Delete
                            </button>
                          </div>
                          <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>
                            {tagCount} location{tagCount === 1 ? "" : "s"}
                          </div>
                          <div style={{ display: "flex", gap: "var(--space-xxs)" }}>
                            <button
                              onClick={() => handleAssignSelectedToTag(tag.name)}
                              tabIndex={-1}
                              disabled={selectedLocationCount === 0}
                              style={{
                                flex: 1,
                                padding: "4px var(--space-xs)",
                                backgroundColor: "var(--surface-default)",
                                border: "var(--border-width-thin) solid var(--border-primary)",
                                borderRadius: "var(--radius-xs)",
                                cursor: selectedLocationCount === 0 ? "not-allowed" : "pointer",
                                fontSize: "10px",
                                color: "var(--text-primary)",
                                opacity: selectedLocationCount === 0 ? 0.6 : 1,
                              }}
                            >
                              Add Selected
                            </button>
                            <button
                              onClick={() => handleRemoveSelectedFromTag(tag.name)}
                              tabIndex={-1}
                              disabled={selectedLocationCount === 0}
                              style={{
                                flex: 1,
                                padding: "4px var(--space-xs)",
                                backgroundColor: "var(--surface-default)",
                                border: "var(--border-width-thin) solid var(--border-primary)",
                                borderRadius: "var(--radius-xs)",
                                cursor: selectedLocationCount === 0 ? "not-allowed" : "pointer",
                                fontSize: "10px",
                                color: "var(--text-primary)",
                                opacity: selectedLocationCount === 0 ? 0.6 : 1,
                              }}
                            >
                              Remove Selected
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}
          </div>

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
