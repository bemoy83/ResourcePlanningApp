import { WorkCategoryRow } from './WorkCategoryRow';

interface EventSection {
  eventId: string;
  eventName: string;
  workCategories: {
    id: string;
    name: string;
    estimatedEffortHours: number;
  }[];
}

interface PlanningBoardGridProps {
  dates: string[];
  eventSections: EventSection[];
  allocations: {
    id: string;
    eventId: string;
    workCategoryId: string;
    date: string;
    effortHours: number;
  }[];
  dailyDemand: {
    date: string;
    totalEffortHours: number;
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
}

export function PlanningBoardGrid({
  dates,
  eventSections,
  allocations,
  dailyDemand,
  drafts,
  errorsByCellKey,
  onStartEdit,
  onChangeDraft,
  onCommit,
  onCancel,
}: PlanningBoardGridProps) {
  const gridTemplateColumns = `150px 200px 100px repeat(${dates.length}, 100px)`;
  const cellStyle = {
    border: '1px solid #ccc',
    padding: '8px',
    textAlign: 'center' as const,
  };

  return (
    <section>
      <header style={{ display: 'grid', gridTemplateColumns }}>
        <div style={cellStyle}>Event</div>
        <div style={cellStyle}>Work Category</div>
        <div style={cellStyle}>Estimate</div>
        {dates.map((date) => (
          <div key={date} style={cellStyle}>{date}</div>
        ))}
      </header>

      <div>
        {eventSections.map((eventSection) => (
          <div key={eventSection.eventId}>
            <div style={{ display: 'grid', gridTemplateColumns, padding: '8px', border: '1px solid #ccc' }}>
              <div style={{ fontWeight: 'bold' }}>{eventSection.eventName}</div>
            </div>
            {eventSection.workCategories.map((workCategory) => (
              <WorkCategoryRow
                key={workCategory.id}
                eventName={eventSection.eventName}
                workCategory={workCategory}
                dates={dates}
                allocations={allocations}
                drafts={drafts}
                errorsByCellKey={errorsByCellKey}
                onStartEdit={onStartEdit}
                onChangeDraft={onChangeDraft}
                onCommit={onCommit}
                onCancel={onCancel}
                gridTemplateColumns={gridTemplateColumns}
                cellStyle={cellStyle}
              />
            ))}
          </div>
        ))}
      </div>

      <footer style={{ display: 'grid', gridTemplateColumns }}>
        <div style={cellStyle}></div>
        <div style={cellStyle}>Total Demand</div>
        <div style={cellStyle}></div>
        {dates.map((date) => {
          const demand = dailyDemand.find((d) => d.date === date);
          return (
            <div key={date} style={cellStyle}>
              {demand && demand.totalEffortHours > 0 ? `${demand.totalEffortHours}h` : '—'}
            </div>
          );
        })}
      </footer>
    </section>
  );
}
