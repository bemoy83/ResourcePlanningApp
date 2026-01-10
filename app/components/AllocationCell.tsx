interface Allocation {
  id: string;
  effortHours: number;
}

interface AllocationDraft {
  allocationId: string | null;
  key: string;
  effortValue: number;
  effortUnit: "HOURS" | "FTE";
}

interface AllocationCellProps {
  workCategoryId: string;
  date: string;
  allocation?: Allocation;
  draft?: AllocationDraft;
  error?: string;
  onStartCreate(workCategoryId: string, date: string): void;
  onStartEdit(allocationId: string, workCategoryId: string, date: string, effortHours: number): void;
  onChangeDraft(draftKey: string, effortValue: number, effortUnit: "HOURS" | "FTE"): void;
  onCommit(draftKey: string): void;
  onCancel(draftKey: string): void;
  onDelete(allocationId: string): void;
}

export function AllocationCell({
  workCategoryId,
  date,
  allocation,
  draft,
  error,
  onStartCreate,
  onStartEdit,
  onChangeDraft,
  onCommit,
  onCancel,
  onDelete,
}: AllocationCellProps) {
  // Draft mode - show edit UI
  if (draft) {
    return (
      <div onClick={(e) => e.stopPropagation()} style={{ padding: '4px', backgroundColor: '#f5f5f5', border: '2px solid #333', position: 'relative', zIndex: 100 }}>
        <input
          type="number"
          value={draft.effortValue}
          onChange={(e) =>
            onChangeDraft(
              draft.key,
              Number(e.target.value),
              draft.effortUnit
            )
          }
          style={{ width: '60px', marginBottom: '4px' }}
        />

        <select
          value={draft.effortUnit}
          onChange={(e) =>
            onChangeDraft(
              draft.key,
              draft.effortValue,
              e.target.value as "HOURS" | "FTE"
            )
          }
          style={{ width: '70px', marginBottom: '4px' }}
        >
          <option value="HOURS">HOURS</option>
          <option value="FTE">FTE</option>
        </select>

        <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
          <button onClick={() => onCommit(draft.key)} style={{ padding: '2px 4px', fontSize: '10px' }}>
            Save
          </button>
          <button onClick={() => onCancel(draft.key)} style={{ padding: '2px 4px', fontSize: '10px' }}>
            Cancel
          </button>
          {draft.allocationId && (
            <button
              onClick={() => {
                if (confirm('Delete this allocation?')) {
                  onDelete(draft.allocationId!);
                  onCancel(draft.key);
                }
              }}
              style={{ padding: '2px 4px', fontSize: '10px', backgroundColor: '#fee', color: 'red' }}
            >
              Delete
            </button>
          )}
        </div>

        {error && (
          <div style={{ color: 'red', fontSize: '10px', marginTop: '4px' }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  // Allocated cell - show value and allow edit on click
  if (allocation) {
    return (
      <div
        onClick={() => onStartEdit(allocation.id, workCategoryId, date, allocation.effortHours)}
        style={{
          cursor: 'pointer',
          padding: '4px',
          backgroundColor: '#e0e0e0',
          fontWeight: 'bold',
          color: '#000',
          border: '1px solid #666',
        }}
        title="Click to edit"
      >
        {allocation.effortHours}h
      </div>
    );
  }

  // Empty cell - allow create on click
  return (
    <div
      onClick={() => onStartCreate(workCategoryId, date)}
      style={{
        cursor: 'pointer',
        padding: '4px',
        color: '#666',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        minHeight: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      title="Click to add allocation"
    >
      —
    </div>
  );
}
