import { AllocationCell } from './AllocationCell';
import { DateFlags } from '../utils/date';

interface WorkCategory {
  id: string;
  name: string;
  estimatedEffortHours: number;
}

interface Allocation {
  id: string;
  workCategoryId: string;
  date: string;
  effortHours: number;
}

interface AllocationDraft {
  allocationId: string | null;
  key: string;
  workCategoryId: string;
  date: string;
  effortValue: number;
  effortUnit: "HOURS" | "FTE";
}

interface WorkCategoryPressure {
  workCategoryId: string;
  remainingEffortHours: number;
  remainingDays: number;
  isUnderPressure: boolean;
}

interface WorkCategoryRowProps {
  eventName: string;
  workCategory: WorkCategory;
  allocatedTotal: number;
  remaining: number;
  pressure?: WorkCategoryPressure;
  dates: string[];
  dateMeta: DateFlags[];
  dateColumnWidth: number;
  timelineOriginPx: number;
  leftColumnOffsets: number[];
  allocations: Allocation[];
  drafts: AllocationDraft[];
  errorsByCellKey: Record<string, string>;
  onStartCreate(workCategoryId: string, date: string): void;
  onStartEdit(allocationId: string, workCategoryId: string, date: string, effortHours: number): void;
  onChangeDraft(draftKey: string, effortValue: number, effortUnit: "HOURS" | "FTE"): void;
  onCommit(draftKey: string): void;
  onCancel(draftKey: string): void;
  onDelete(allocationId: string): void;
  gridTemplateColumns: string;
  cellStyle: React.CSSProperties;
}

export function WorkCategoryRow({
  eventName,
  workCategory,
  allocatedTotal,
  remaining,
  pressure,
  dates,
  dateMeta,
  dateColumnWidth,
  timelineOriginPx,
  leftColumnOffsets,
  allocations,
  drafts,
  errorsByCellKey,
  onStartCreate,
  onStartEdit,
  onChangeDraft,
  onCommit,
  onCancel,
  onDelete,
  gridTemplateColumns,
  cellStyle,
}: WorkCategoryRowProps) {
  // Determine row background color based on pressure
  const rowStyle = pressure?.isUnderPressure
    ? { ...cellStyle, backgroundColor: 'var(--status-warning-light)' }
    : cellStyle;

  const progressPercentage = workCategory.estimatedEffortHours > 0
    ? Math.round((allocatedTotal / workCategory.estimatedEffortHours) * 100)
    : 0;

  const timelineWidth = dates.length * dateColumnWidth;
  const weekendBackground = "var(--calendar-weekend-bg)";
  const holidayBackground = "var(--calendar-holiday-bg)";

  const CELL_BORDER_WIDTH = 1;

  const stickyColumnStyle = (offset: number): React.CSSProperties => ({
    position: 'sticky',
    left: `${offset}px`,
    zIndex: 'var(--z-sticky-column)' as any,
    backgroundColor: 'var(--sticky-column-bg)',
    border: `${CELL_BORDER_WIDTH}px solid var(--sticky-column-border)`,
    color: 'var(--sticky-column-text)',
  });

  return (
    <section style={{ display: 'grid', gridTemplateColumns, position: 'relative', minWidth: `${timelineOriginPx + timelineWidth}px` }}>
      {/* Event name */}
      <div style={{ ...rowStyle, ...stickyColumnStyle(leftColumnOffsets[0]) }}>
        <div>{eventName}</div>
      </div>

      {/* Work category name */}
      <div style={{ ...rowStyle, ...stickyColumnStyle(leftColumnOffsets[1]) }}>
        <div>{workCategory.name}</div>
        {pressure?.isUnderPressure && (
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--status-warning)', marginTop: 'var(--space-xxs)' }}>
            ⚠ Pressure: {pressure.remainingDays} days left
          </div>
        )}
      </div>

      {/* Estimated effort */}
      <div style={{ ...rowStyle, ...stickyColumnStyle(leftColumnOffsets[2]) }}>
        <div style={{ fontWeight: 'var(--font-weight-bold)' }}>{workCategory.estimatedEffortHours}h</div>
      </div>

      {/* Allocated total with progress bar */}
      <div style={{ ...rowStyle, ...stickyColumnStyle(leftColumnOffsets[3]) }}>
        <div style={{
          fontWeight: 'var(--font-weight-bold)',
          lineHeight: '1.2',
          fontSize: 'var(--font-size-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
        }}>
          <span>{allocatedTotal}h</span>
          <span style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-tertiary)',
            fontWeight: 'var(--font-weight-normal)',
          }}>—</span>
          <span style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-tertiary)',
            fontWeight: 'var(--font-weight-normal)',
          }}>{progressPercentage}%</span>
        </div>
        <div style={{
          marginTop: '3px',
          height: '2px',
          backgroundColor: 'var(--surface-progress-track)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          width: '100%',
        }}>
          <div style={{
            width: `${Math.min(progressPercentage, 100)}%`,
            height: '100%',
            backgroundColor: progressPercentage >= 100 ? 'var(--status-success)' : 'var(--status-info)',
          }} />
        </div>
      </div>

      {/* Remaining effort */}
      <div style={{
        ...rowStyle,
        ...stickyColumnStyle(leftColumnOffsets[4]),
        color: remaining < 0 ? 'var(--status-error)' : remaining > 0 ? 'inherit' : 'var(--status-success)',
        fontWeight: remaining !== 0 ? 'var(--font-weight-bold)' : 'var(--font-weight-normal)',
      }}>
        {remaining > 0 ? `${remaining}h` : remaining < 0 ? `${Math.abs(remaining)}h (over)` : '✓ Complete'}
      </div>

      <div style={{
        position: 'absolute',
        left: `${timelineOriginPx}px`,
        top: 0,
        height: '100%',
        width: `${timelineWidth}px`,
      }}>
        {dates.map((date, index) => {
          const cellKey = `${workCategory.id}::${date}`;
          const allocation = allocations.find(
            (a) => a.workCategoryId === workCategory.id && a.date === date
          );
          const draft = drafts.find(
            (d) => d.workCategoryId === workCategory.id && d.date === date
          );
          const error = errorsByCellKey[cellKey];
          const dateFlags = dateMeta[index];
          const backgroundColor = dateFlags?.isHoliday
            ? holidayBackground
            : dateFlags?.isWeekend
            ? weekendBackground
            : 'var(--surface-default)';
          const borderColor = dateFlags?.isHoliday
            ? "var(--calendar-holiday-border)"
            : dateFlags?.isWeekend
            ? "var(--calendar-weekend-border)"
            : "var(--border-primary)";

          return (
            <div
              key={cellKey}
              style={{
                ...cellStyle,
                position: 'absolute',
                left: `${index * dateColumnWidth}px`,
                top: 0,
                width: `${dateColumnWidth}px`,
                height: '100%',
                backgroundColor,
                border: `1px solid ${borderColor}`,
                overflow: 'visible',
              }}
            >
              <AllocationCell
                workCategoryId={workCategory.id}
                date={date}
                allocation={allocation}
                draft={draft}
                error={error}
                onStartCreate={onStartCreate}
                onStartEdit={onStartEdit}
                onChangeDraft={onChangeDraft}
                onCommit={onCommit}
                onCancel={onCancel}
                onDelete={onDelete}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
