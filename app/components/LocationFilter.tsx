"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Chip } from "./Chip";
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
  const [activeGroupName, setActiveGroupName] = useState<string | null>(null); // Track which group was last clicked
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
      setActiveGroupName(null);
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
      setTagError("Group name cannot be empty.");
      return;
    }
    if (trimmedName.length > TAG_NAME_MAX_LENGTH) {
      setTagError(`Group name must be ${TAG_NAME_MAX_LENGTH} characters or fewer.`);
      return;
    }
    const existingTag = tagStore.tags.find(
      (tag) => tag.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingTag) {
      setTagError("Group name already exists.");
      return;
    }
    // Create new group with currently selected locations
    const initialLocationIds = Array.from(selectedLocationIds);
    setTagStore((prev) => ({
      tags: [...prev.tags, trimmedName],
      byTag: { ...prev.byTag, [trimmedName]: initialLocationIds },
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

  const handleUpdateTagLocations = (tagName: string) => {
    // Update group to match current selection
    if (selectedLocationIds.size === 0) return;
    setTagStore((prev) => ({
      ...prev,
      byTag: { ...prev.byTag, [tagName]: Array.from(selectedLocationIds) },
    }));
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
      <Chip
        onClick={() => setIsOpen(!isOpen)}
        selected={someSelected || allSelected}
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
            width: tagsExpanded ? "520px" : "280px",
            maxWidth: "90vw",
            maxHeight: "420px",
            overflow: "hidden",
            zIndex: "var(--z-dropdown-panel)" as any,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Main content area - side by side when expanded */}
          <div style={{ display: "flex", flex: 1, minHeight: 0, maxHeight: "360px" }}>
            {/* Left panel - Locations */}
            <div
              role="listbox"
              aria-multiselectable="true"
              onKeyDown={handleKeyDown}
              style={{
                flex: tagsExpanded ? "0 0 280px" : "1 1 auto",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                overflowY: "auto",
                borderRight: tagsExpanded ? "var(--border-width-thin) solid var(--border-primary)" : "none",
              }}
            >
              {/* Sticky header */}
              <div style={{ position: "sticky", top: 0, zIndex: 1, backgroundColor: "var(--surface-default)" }}>
                {/* Search Input */}
                <div style={{ padding: "var(--space-sm)", backgroundColor: "var(--surface-default)" }}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search locations..."
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
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)", marginTop: "var(--space-xs)", paddingLeft: "var(--space-xs)" }}>
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
                    padding: "10px var(--space-sm)",
                    borderBottom: "var(--border-width-thin) solid var(--border-primary)",
                    backgroundColor: "var(--surface-default)",
                    color: "var(--text-primary)",
                    gap: "var(--space-sm)",
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", cursor: "pointer", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      tabIndex={-1}
                      ref={(input) => { if (input) input.indeterminate = someSelected; }}
                      onChange={toggleAll}
                      style={{ marginRight: "var(--space-sm)", cursor: "pointer", width: "16px", height: "16px" }}
                      aria-label="Select all locations"
                    />
                    <span>All Locations</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setTagsExpanded((prev) => !prev)}
                    tabIndex={-1}
                    style={{
                      border: "var(--border-width-thin) solid var(--border-primary)",
                      background: tagsExpanded ? "var(--btn-selected-bg)" : "var(--surface-default)",
                      padding: "4px 10px",
                      borderRadius: "var(--radius-full)",
                      cursor: "pointer",
                      fontSize: "var(--font-size-xs)",
                      color: tagsExpanded ? "var(--btn-selected-text)" : "var(--text-secondary)",
                      transition: "all var(--transition-fast)",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-xs)",
                    }}
                    aria-label={tagsExpanded ? "Collapse groups" : "Expand groups"}
                  >
                    {tagGroups.length > 0 && (
                      <span style={{
                        backgroundColor: tagsExpanded ? "rgba(255,255,255,0.2)" : "var(--text-tertiary)",
                        color: tagsExpanded ? "var(--btn-selected-text)" : "var(--text-inverse)",
                        borderRadius: "var(--radius-full)",
                        padding: "0 6px",
                        fontSize: "10px",
                        fontWeight: "var(--font-weight-semibold)",
                        minWidth: "18px",
                        textAlign: "center",
                      }}>
                        {tagGroups.length}
                      </span>
                    )}
                    Groups {tagsExpanded ? "◂" : "▸"}
                  </button>
                </div>
              </div>

              {/* Location list */}
              {filteredLocations.length === 0 ? (
                <div style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "center", fontSize: "var(--font-size-sm)", color: "var(--text-tertiary)" }}>
                  No locations match &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredLocations.map((location, index) => {
                  const isChecked = selectedLocationIds.has(location.id);
                  const isFocused = focusedIndex === index;
                  return (
                    <label
                      key={location.id}
                      ref={(el) => { if (el) listItemRefs.current.set(index, el); else listItemRefs.current.delete(index); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "8px var(--space-sm)",
                        cursor: "pointer",
                        fontSize: "var(--font-size-sm)",
                        backgroundColor: isFocused || isChecked ? "var(--surface-hover)" : "var(--surface-default)",
                        color: "var(--text-primary)",
                        transition: "background-color var(--transition-fast)",
                        borderLeft: isChecked ? "2px solid var(--btn-selected-bg)" : "2px solid transparent",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-hover)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isChecked ? "var(--surface-hover)" : "var(--surface-default)"; }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        tabIndex={-1}
                        onChange={() => toggleLocation(location.id)}
                        style={{ marginRight: "var(--space-sm)", cursor: "pointer", width: "16px", height: "16px" }}
                        aria-label={`Select ${location.name}`}
                      />
                      <span style={{ flex: "1 1 auto", minWidth: 0 }}>{location.name}</span>
                      {tagsByLocationId.has(location.id) && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xxs)", marginLeft: "var(--space-sm)", justifyContent: "flex-end", flex: "0 0 auto" }}>
                          {(() => {
                            const tags = tagsByLocationId.get(location.id)!;
                            const visibleTags = tags.slice(0, 2);
                            const overflowCount = tags.length - visibleTags.length;
                            return (
                              <>
                                {visibleTags.map((tag) => (
                                  <span key={tag} style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "var(--radius-full)", border: "var(--border-width-thin) solid var(--border-primary)", backgroundColor: "var(--surface-default)", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                                    {tag}
                                  </span>
                                ))}
                                {overflowCount > 0 && (
                                  <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "var(--radius-full)", border: "var(--border-width-thin) dashed var(--border-primary)", backgroundColor: "var(--bg-secondary)", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
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

            {/* Right panel - Groups (always visible when expanded) */}
            {tagsExpanded && (
              <div style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", backgroundColor: "var(--bg-secondary)", minHeight: 0 }}>
                {/* Groups header */}
                <div style={{ padding: "var(--space-sm)", borderBottom: "var(--border-width-thin) solid var(--border-primary)", backgroundColor: "var(--bg-secondary)" }}>
                  <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "var(--space-sm)" }}>
                    Location Groups
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                    <input
                      type="text"
                      value={newTagName}
                      tabIndex={-1}
                      placeholder="New group..."
                      onChange={(e) => { setNewTagName(e.target.value); if (tagError) setTagError(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); handleAddTag(); } }}
                      style={{
                        flex: 1,
                        padding: "6px 10px",
                        fontSize: "var(--font-size-xs)",
                        border: "var(--border-width-thin) solid var(--border-primary)",
                        borderRadius: "var(--radius-full)",
                        outline: "none",
                        backgroundColor: "var(--surface-default)",
                        color: "var(--text-primary)",
                        transition: "border-color var(--transition-fast)",
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--interactive-focus)"; e.currentTarget.style.boxShadow = "0 0 0 2px var(--interactive-focus-bg)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-primary)"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                    <button
                      onClick={handleAddTag}
                      tabIndex={-1}
                      disabled={newTagName.trim().length === 0}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: newTagName.trim().length === 0 ? "var(--surface-default)" : "var(--btn-selected-bg)",
                        border: "none",
                        borderRadius: "var(--radius-full)",
                        cursor: newTagName.trim().length === 0 ? "not-allowed" : "pointer",
                        fontSize: "var(--font-size-xs)",
                        fontWeight: "var(--font-weight-medium)",
                        color: newTagName.trim().length === 0 ? "var(--text-tertiary)" : "var(--btn-selected-text)",
                        opacity: newTagName.trim().length === 0 ? 0.6 : 1,
                        transition: "all var(--transition-fast)",
                      }}
                    >
                      +
                    </button>
                  </div>
                  {tagError && (
                    <div style={{ marginTop: "var(--space-xs)", fontSize: "var(--font-size-xs)", color: "var(--status-error)" }}>
                      {tagError}
                    </div>
                  )}
                </div>

                {/* Groups list */}
                <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-sm)" }}>
                  {tagGroups.length === 0 ? (
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)", textAlign: "center", padding: "var(--space-lg) var(--space-sm)" }}>
                      {selectedLocationCount > 0
                        ? `Type a name and click + to save ${selectedLocationCount} selected location${selectedLocationCount === 1 ? "" : "s"} as a group`
                        : "Select locations, then create a group to save them"
                      }
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
                      {tagGroups.map((tag) => {
                        const tagCount = tag.locationIds.length;
                        const isGroupSelected = tagCount > 0 && tag.locationIds.every((id) => selectedLocationIds.has(id));
                        const isExactMatch = isGroupSelected && selectedLocationIds.size === tagCount;
                        // Only show Save on the active group (last clicked) when selection has changed
                        const isActiveGroup = activeGroupName === tag.name;
                        const selectionDiffers = !isExactMatch && selectedLocationCount > 0;
                        const canUpdate = isActiveGroup && selectionDiffers;

                        return (
                          <div
                            key={tag.name}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "8px 10px",
                              backgroundColor: isExactMatch ? "var(--btn-selected-bg)" : "var(--surface-default)",
                              border: `var(--border-width-thin) solid ${isExactMatch ? "var(--btn-selected-bg)" : "var(--border-primary)"}`,
                              borderRadius: "var(--radius-md)",
                              cursor: tagCount > 0 ? "pointer" : "default",
                              transition: "all var(--transition-fast)",
                            }}
                            onClick={() => { if (tagCount > 0) { setActiveGroupName(tag.name); onSelectionChange(new Set(tag.locationIds)); } }}
                            onMouseEnter={(e) => { if (!isExactMatch && tagCount > 0) e.currentTarget.style.backgroundColor = "var(--surface-hover)"; }}
                            onMouseLeave={(e) => { if (!isExactMatch) e.currentTarget.style.backgroundColor = "var(--surface-default)"; }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", minWidth: 0, flex: 1 }}>
                              <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", color: isExactMatch ? "var(--btn-selected-text)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {tag.name}
                              </span>
                              <span style={{ fontSize: "var(--font-size-xs)", color: isExactMatch ? "var(--btn-selected-text)" : "var(--text-tertiary)", opacity: 0.8 }}>
                                {tagCount}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              {canUpdate && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleUpdateTagLocations(tag.name); }}
                                  tabIndex={-1}
                                  title={`Update to current selection (${selectedLocationCount})`}
                                  style={{
                                    padding: "3px 8px",
                                    backgroundColor: "var(--status-info)",
                                    border: "none",
                                    borderRadius: "var(--radius-full)",
                                    cursor: "pointer",
                                    fontSize: "10px",
                                    color: "white",
                                    transition: "opacity var(--transition-fast)",
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                                >
                                  Save
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemoveTag(tag.name); }}
                                tabIndex={-1}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "20px",
                                  height: "20px",
                                  padding: 0,
                                  backgroundColor: "transparent",
                                  border: "none",
                                  borderRadius: "var(--radius-full)",
                                  cursor: "pointer",
                                  fontSize: "14px",
                                  color: isExactMatch ? "var(--btn-selected-text)" : "var(--text-tertiary)",
                                  opacity: 0.6,
                                  transition: "opacity var(--transition-fast)",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; }}
                                aria-label={`Delete ${tag.name} group`}
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selection hint at bottom */}
                {selectedLocationCount > 0 && tagGroups.length > 0 && (
                  <div style={{ padding: "var(--space-xs) var(--space-sm)", borderTop: "var(--border-width-thin) solid var(--border-primary)", fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)", backgroundColor: "var(--bg-tertiary)" }}>
                    {selectedLocationCount} selected
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "var(--space-sm)",
              borderTop: "var(--border-width-thin) solid var(--border-primary)",
              backgroundColor: "var(--surface-default)",
              gap: "var(--space-sm)",
            }}
          >
            <Button onClick={() => onSelectionChange(new Set())} tabIndex={-1} variant="ghost" size="sm" style={{ flex: 1 }}>
              Clear
            </Button>
            <Button onClick={() => setIsOpen(false)} tabIndex={-1} variant="chip-selected" size="sm" style={{ flex: 1 }}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
