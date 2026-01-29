"use client";

import { Button } from "../Button";
import { SegmentedControl } from "../SegmentedControl";

interface EventNavigatorProps {
  canGoPrevious: boolean;
  canGoNext: boolean;
  label: string;
  title?: string;
  onPrevious: () => void;
  onNext: () => void;
}

export function EventNavigator({
  canGoPrevious,
  canGoNext,
  label,
  title,
  onPrevious,
  onNext,
}: EventNavigatorProps) {
  return (
    <SegmentedControl
      style={{
        marginLeft: "var(--space-sm)",
      }}
      title={title}
    >
      <Button
        onClick={onPrevious}
        disabled={!canGoPrevious}
        aria-label="Locate previous selected event"
        variant="segmented"
        size="sm"
        style={{
          padding: "6px 14px",
        }}
      >
        Prev
      </Button>
      <Button
        onClick={onNext}
        disabled={!canGoNext}
        aria-label="Locate next selected event"
        variant="segmented"
        size="sm"
        style={{
          padding: "6px 14px",
        }}
      >
        Next
      </Button>
      <span
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--text-tertiary)",
          padding: "0 var(--space-sm)",
          minWidth: "100px",
        }}
      >
        {label}
      </span>
    </SegmentedControl>
  );
}
