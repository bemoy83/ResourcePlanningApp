import { useMemo, useState } from 'react';

export function useEventHoverHighlight<RelatedId extends string>(
  eventIdToRelatedIds: Map<string, RelatedId[]>
) {
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  const highlightedIds = useMemo(() => {
    if (!hoveredEventId) {
      return new Set<RelatedId>();
    }
    const relatedIds = eventIdToRelatedIds.get(hoveredEventId) || [];
    return new Set(relatedIds);
  }, [hoveredEventId, eventIdToRelatedIds]);

  return { hoveredEventId, setHoveredEventId, highlightedIds };
}
