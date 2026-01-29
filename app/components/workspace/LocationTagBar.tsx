"use client";

import { Chip } from "../Chip";
import { SegmentedControl } from "../SegmentedControl";

interface LocationTagGroup {
  name: string;
  locationIds: string[];
}

interface LocationTagBarProps {
  groups: LocationTagGroup[];
  selectedLocationIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

export function LocationTagBar({
  groups,
  selectedLocationIds,
  onSelectionChange,
}: LocationTagBarProps) {
  if (groups.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        flexWrap: "wrap",
        marginBottom: "var(--space-md)",
      }}
    >
      <span
        style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-medium)",
          color: "var(--text-tertiary)",
          marginRight: "var(--space-xs)",
        }}
      >
        Location Tags:
      </span>
      <SegmentedControl
        style={{
          flexWrap: "wrap",
          gap: "var(--space-sm)",
        }}
      >
        {groups.map((group) => {
          const tagCount = group.locationIds.length;
          const matchingCount = group.locationIds.filter((id) =>
            selectedLocationIds.has(id)
          ).length;
          const isTagSelected = tagCount > 0 && matchingCount === tagCount;

          return (
            <Chip
              key={group.name}
              selected={isTagSelected}
              disabled={tagCount === 0}
              onClick={() => {
                if (tagCount === 0) return;
                if (matchingCount === tagCount) {
                  // Deselect all locations in this tag
                  const nextSelection = new Set(selectedLocationIds);
                  for (const id of group.locationIds) {
                    nextSelection.delete(id);
                  }
                  onSelectionChange(nextSelection);
                  return;
                }
                // Select all locations in this tag
                const nextSelection = new Set(selectedLocationIds);
                for (const id of group.locationIds) {
                  nextSelection.add(id);
                }
                onSelectionChange(nextSelection);
              }}
              variant="segmented"
            >
              {group.name} ({tagCount})
            </Chip>
          );
        })}
      </SegmentedControl>
    </div>
  );
}
