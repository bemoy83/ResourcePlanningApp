import { WorkCategoryRow } from './WorkCategoryRow';

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

interface DailyDemand {
  date: string;
  totalEffortHours: number;
}

interface DailyCapacityComparison {
  date: string;
  demandHours: number;
  capacityHours: number;
  isOverAllocated: boolean;
  isUnderAllocated: boolean;
}

interface WorkCategoryPressure {
  workCategoryId: string;
  remainingEffortHours: number;
  remainingDays: number;
  isUnderPressure: boolean;
}

interface Evaluation {
  dailyDemand: DailyDemand[];
  dailyCapacityComparison: DailyCapacityComparison[];
  workCategoryPressure: WorkCategoryPressure[];
}

interface CrossEventEvaluation {
  crossEventDailyDemand: DailyDemand[];
  crossEventCapacityComparison: DailyCapacityComparison[];
}

interface PlanningBoardGridProps {
  eventName: string;
  dates: string[];
  workCategories: WorkCategory[];
  allocations: Allocation[];
  evaluation: Evaluation;
  crossEventEvaluation: CrossEventEvaluation;
  drafts: AllocationDraft[];
  errorsByCellKey: Record<string, string>;
  onStartCreate(workCategoryId: string, date: string): void;
  onStartEdit(allocationId: string, workCategoryId: string, date: string, effortHours: number): void;
  onChangeDraft(draftKey: string, effortValue: number, effortUnit: "HOURS" | "FTE"): void;
  onCommit(draftKey: string): void;
  onCancel(draftKey: string): void;
  onDelete(allocationId: string): void;
}

export function PlanningBoardGrid({
  eventName,
  dates,
  workCategories,
  allocations,
  evaluation,
  crossEventEvaluation,
  drafts,
  errorsByCellKey,
  onStartCreate,
  onStartEdit,
  onChangeDraft,
  onCommit,
  onCancel,
  onDelete,
}: PlanningBoardGridProps) {
  const gridTemplateColumns = `200px 100px 100px 100px repeat(${dates.length}, 100px)`;
  const cellStyle = {
    border: '1px solid #999',
    padding: '8px',
    textAlign: 'center' as const,
    fontSize: '12px',
    backgroundColor: '#fff',
    color: '#000',
  };

  // Build pressure map for quick lookup
  const pressureMap = new Map<string, WorkCategoryPressure>();
  for (const pressure of evaluation.workCategoryPressure) {
    pressureMap.set(pressure.workCategoryId, pressure);
  }

  // Build capacity comparison map for quick lookup
  const capacityMap = new Map<string, DailyCapacityComparison>();
  for (const comparison of evaluation.dailyCapacityComparison) {
    capacityMap.set(comparison.date, comparison);
  }

  return (
    <section>
      <div style={{
        marginBottom: '8px',
        padding: '8px',
        backgroundColor: '#f5f5f5',
        border: '2px solid #666',
        fontSize: '12px',
        color: '#000',
      }}>
        <strong>Planning Grid:</strong> Click any cell to add or edit allocations. All values shown in hours (h).
      </div>

      {/* Header */}
      <header style={{ display: 'grid', gridTemplateColumns, backgroundColor: '#e0e0e0', fontWeight: 'bold', border: '2px solid #666' }}>
        <div style={cellStyle}>
          <div>Work Category</div>
        </div>
        <div style={cellStyle}>
          <div>Estimate</div>
          <div style={{ fontSize: '10px', fontWeight: 'normal' }}>total hours</div>
        </div>
        <div style={cellStyle}>
          <div>Allocated</div>
          <div style={{ fontSize: '10px', fontWeight: 'normal' }}>total hours</div>
        </div>
        <div style={cellStyle}>
          <div>Remaining</div>
          <div style={{ fontSize: '10px', fontWeight: 'normal' }}>to allocate</div>
        </div>
        {dates.map((date) => (
          <div key={date} style={cellStyle}>
            <div>{date}</div>
          </div>
        ))}
      </header>

      {/* Work category rows */}
      <div style={{ border: '1px solid #666' }}>
        {workCategories.map((workCategory) => {
          const pressure = pressureMap.get(workCategory.id);
          const allocatedTotal = allocations
            .filter((a) => a.workCategoryId === workCategory.id)
            .reduce((sum, a) => sum + a.effortHours, 0);
          const remaining = workCategory.estimatedEffortHours - allocatedTotal;

          return (
            <WorkCategoryRow
              key={workCategory.id}
              eventName={eventName}
              workCategory={workCategory}
              allocatedTotal={allocatedTotal}
              remaining={remaining}
              pressure={pressure}
              dates={dates}
              allocations={allocations}
              drafts={drafts}
              errorsByCellKey={errorsByCellKey}
              onStartCreate={onStartCreate}
              onStartEdit={onStartEdit}
              onChangeDraft={onChangeDraft}
              onCommit={onCommit}
              onCancel={onCancel}
              onDelete={onDelete}
              gridTemplateColumns={gridTemplateColumns}
              cellStyle={cellStyle}
            />
          );
        })}
      </div>

      {/* Footer with totals */}
      <footer style={{ display: 'grid', gridTemplateColumns, backgroundColor: '#e0e0e0', marginTop: '10px', border: '2px solid #666' }}>
        <div style={{ ...cellStyle, fontWeight: 'bold' }}>
          <div>Total Demand</div>
          <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#666' }}>per day</div>
        </div>
        <div style={cellStyle}></div>
        <div style={cellStyle}></div>
        <div style={cellStyle}></div>
        {dates.map((date) => {
          const demand = evaluation.dailyDemand.find((d) => d.date === date);
          const comparison = capacityMap.get(date);

          // Determine if this day has any issues
          const hasIssue = comparison?.isOverAllocated;

          return (
            <div key={date} style={{
              ...cellStyle,
              fontWeight: 'bold',
              color: hasIssue ? 'red' : 'inherit',
            }}>
              {demand && demand.totalEffortHours > 0 ? `${demand.totalEffortHours}h` : '—'}
            </div>
          );
        })}
      </footer>

      {/* Capacity comparison row */}
      {evaluation.dailyCapacityComparison.length > 0 && (
        <footer style={{ display: 'grid', gridTemplateColumns, backgroundColor: '#e0e0e0', marginTop: '2px', border: '2px solid #666' }}>
          <div style={{ ...cellStyle, fontWeight: 'bold' }}>
            <div>Capacity</div>
            <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#666' }}>available per day</div>
          </div>
          <div style={cellStyle}></div>
          <div style={cellStyle}></div>
          <div style={cellStyle}></div>
          {dates.map((date) => {
            const comparison = capacityMap.get(date);
            if (!comparison || comparison.capacityHours === 0) {
              return <div key={date} style={cellStyle}>—</div>;
            }

            const statusStyle = comparison.isOverAllocated
              ? { ...cellStyle, backgroundColor: '#fee', color: 'red' }
              : comparison.isUnderAllocated
              ? { ...cellStyle, backgroundColor: '#efe', color: 'green' }
              : cellStyle;

            return (
              <div key={date} style={statusStyle} title={`Demand: ${comparison.demandHours}h, Capacity: ${comparison.capacityHours}h`}>
                <div style={{ fontWeight: 'bold' }}>{comparison.capacityHours}h</div>
                {comparison.isOverAllocated && (
                  <div style={{ fontSize: '10px' }}>
                    +{(comparison.demandHours - comparison.capacityHours).toFixed(1)}h over
                  </div>
                )}
                {comparison.isUnderAllocated && (
                  <div style={{ fontSize: '10px' }}>
                    {(comparison.capacityHours - comparison.demandHours).toFixed(1)}h free
                  </div>
                )}
              </div>
            );
          })}
        </footer>
      )}

      {/* Cross-Event Context Section */}
      {crossEventEvaluation.crossEventDailyDemand.length > 0 && (
        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#f5f5f5',
          border: '3px solid #333',
        }}>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#000',
            borderBottom: '2px solid #666',
            paddingBottom: '8px',
          }}>
            Cross-Event Context (Read-Only)
          </h3>
          <div style={{ fontSize: '11px', color: '#333', marginBottom: '12px' }}>
            Total demand across all active events. This is advisory context only—no events are modified.
          </div>

          {/* Cross-event demand row */}
          <footer style={{ display: 'grid', gridTemplateColumns, backgroundColor: '#e0e0e0', border: '2px solid #666' }}>
            <div style={{ ...cellStyle, fontWeight: 'bold' }}>
              <div>Total Demand (All Events)</div>
              <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#666' }}>aggregated</div>
            </div>
            <div style={cellStyle}></div>
            <div style={cellStyle}></div>
            <div style={cellStyle}></div>
            {dates.map((date) => {
              const crossDemand = crossEventEvaluation.crossEventDailyDemand.find((d) => d.date === date);
              const crossComparison = crossEventEvaluation.crossEventCapacityComparison.find((c) => c.date === date);

              // Color code based on cross-event pressure
              const hasIssue = crossComparison?.isOverAllocated;

              return (
                <div key={date} style={{
                  ...cellStyle,
                  fontWeight: 'bold',
                  color: hasIssue ? 'red' : 'inherit',
                  backgroundColor: hasIssue ? '#fee' : '#fff',
                }}>
                  {crossDemand && crossDemand.totalEffortHours > 0 ? `${crossDemand.totalEffortHours}h` : '—'}
                </div>
              );
            })}
          </footer>

          {/* Cross-event capacity comparison row */}
          {crossEventEvaluation.crossEventCapacityComparison.length > 0 && (
            <footer style={{ display: 'grid', gridTemplateColumns, backgroundColor: '#e0e0e0', marginTop: '2px', border: '2px solid #666' }}>
              <div style={{ ...cellStyle, fontWeight: 'bold' }}>
                <div>Total Capacity Status</div>
                <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#666' }}>demand vs capacity</div>
              </div>
              <div style={cellStyle}></div>
              <div style={cellStyle}></div>
              <div style={cellStyle}></div>
              {dates.map((date) => {
                const crossComparison = crossEventEvaluation.crossEventCapacityComparison.find((c) => c.date === date);
                if (!crossComparison || crossComparison.capacityHours === 0) {
                  return <div key={date} style={cellStyle}>—</div>;
                }

                const statusStyle = crossComparison.isOverAllocated
                  ? { ...cellStyle, backgroundColor: '#fee', color: 'red' }
                  : crossComparison.isUnderAllocated
                  ? { ...cellStyle, backgroundColor: '#efe', color: 'green' }
                  : cellStyle;

                return (
                  <div key={date} style={statusStyle} title={`All Events Demand: ${crossComparison.demandHours}h, Total Capacity: ${crossComparison.capacityHours}h`}>
                    <div style={{ fontWeight: 'bold' }}>{crossComparison.capacityHours}h</div>
                    {crossComparison.isOverAllocated && (
                      <div style={{ fontSize: '10px' }}>
                        +{(crossComparison.demandHours - crossComparison.capacityHours).toFixed(1)}h over
                      </div>
                    )}
                    {crossComparison.isUnderAllocated && (
                      <div style={{ fontSize: '10px' }}>
                        {(crossComparison.capacityHours - crossComparison.demandHours).toFixed(1)}h free
                      </div>
                    )}
                  </div>
                );
              })}
            </footer>
          )}
        </div>
      )}
    </section>
  );
}
