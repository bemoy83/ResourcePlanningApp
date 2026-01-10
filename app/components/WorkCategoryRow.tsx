import { AllocationCell } from './AllocationCell';

interface WorkCategoryRowProps {
  eventName: string;
  workCategory: {
    id: string;
    name: string;
    estimatedEffortHours: number;
  };
  dates: string[];
  allocations: {
    id: string;
    workCategoryId: string;
    date: string;
    effortHours: number;
  }[];
  drafts: {
    key: string;
    workCategoryId: string;
    date: string;
    effortValue: number;
    effortUnit: "HOURS" | "FTE";
  }[];
  errorsByCellKey: Record<string, string>;
  onStartEdit(workCategoryId: string, date: string): void;
  onChangeDraft(draftKey: string, effortValue: number, effortUnit: "HOURS" | "FTE"): void;
  onCommit(draftKey: string): void;
  onCancel(draftKey: string): void;
  gridTemplateColumns: string;
  cellStyle: React.CSSProperties;
}

export function WorkCategoryRow({
  eventName,
  workCategory,
  dates,
  allocations,
  drafts,
  errorsByCellKey,
  onStartEdit,
  onChangeDraft,
  onCommit,
  onCancel,
  gridTemplateColumns,
  cellStyle,
}: WorkCategoryRowProps) {
  return (
    <section style={{ display: 'grid', gridTemplateColumns }}>
      <div style={cellStyle}>{eventName}</div>
      <div style={cellStyle}>{workCategory.name}</div>
      <div style={cellStyle}>{workCategory.estimatedEffortHours}h</div>
      {dates.map((date) => {
        const cellKey = `${workCategory.id}::${date}`;
        const allocation = allocations.find(
          (a) => a.workCategoryId === workCategory.id && a.date === date
        );
        const draft = drafts.find(
          (d) => d.workCategoryId === workCategory.id && d.date === date
        );
        const error = errorsByCellKey[cellKey];

        return (
          <div key={cellKey} style={cellStyle}>
            <AllocationCell
              workCategoryId={workCategory.id}
              date={date}
              allocation={allocation}
              draft={draft}
              error={error}
              onStartEdit={onStartEdit}
              onChangeDraft={onChangeDraft}
              onCommit={onCommit}
              onCancel={onCancel}
            />
          </div>
        );
      })}
    </section>
  );
}
