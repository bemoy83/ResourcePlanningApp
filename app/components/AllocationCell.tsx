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
      <div onClick={(e) => e.stopPropagation()} style={{
        padding: 'var(--space-xs)',
        backgroundColor: 'var(--bg-tertiary)',
        border: 'var(--border-width-medium) solid var(--border-emphasis)',
        borderRadius: 'var(--radius-md)',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 'var(--z-tooltip)' as any,
        boxShadow: 'var(--shadow-lg)',
        boxSizing: 'border-box',
      }}>
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
          style={{ 
            width: '100%', 
            marginBottom: 'var(--space-xs)',
            boxSizing: 'border-box',
            padding: 'var(--space-xs)',
            fontSize: 'var(--font-size-sm)',
            border: 'var(--border-width-thin) solid var(--border-primary)',
            borderRadius: 'var(--radius-sm)',
          }}
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
          style={{ 
            width: '100%', 
            marginBottom: 'var(--space-xs)',
            boxSizing: 'border-box',
            padding: 'var(--space-xs)',
            fontSize: 'var(--font-size-sm)',
            border: 'var(--border-width-thin) solid var(--border-primary)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <option value="HOURS">HOURS</option>
          <option value="FTE">FTE</option>
        </select>

        <div style={{ display: 'flex', gap: 'var(--space-xs)', flexDirection: 'column' }}>
          <button onClick={() => onCommit(draft.key)} style={{
            width: '100%',
            padding: 'var(--space-xs) var(--space-sm)',
            fontSize: 'var(--font-size-sm)',
            backgroundColor: 'var(--btn-selected-bg)',
            color: 'var(--btn-selected-text)',
            border: 'var(--border-width-thin) solid var(--btn-selected-border)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontWeight: 'var(--font-weight-bold)',
            boxSizing: 'border-box',
          }}>
            Save
          </button>
          <button onClick={() => onCancel(draft.key)} className="btn-ghost" style={{
            width: '100%',
            padding: 'var(--space-xs) var(--space-sm)',
            fontSize: 'var(--font-size-sm)',
            borderRadius: 'var(--radius-sm)',
            boxSizing: 'border-box',
          }}>
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
              style={{
                width: '100%',
                padding: 'var(--space-xs) var(--space-sm)',
                fontSize: 'var(--font-size-sm)',
                backgroundColor: 'var(--capacity-over)',
                color: 'var(--status-error)',
                border: 'var(--border-width-thin) solid var(--status-error)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              Delete
            </button>
          )}
        </div>

        {error && (
          <div style={{
            color: 'var(--status-error)',
            fontSize: 'var(--font-size-xs)',
            marginTop: 'var(--space-xs)'
          }}>
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
          padding: 'var(--space-xs)',
          backgroundColor: 'transparent',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--text-primary)',
          border: 'none',
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
        padding: 'var(--space-xs)',
        color: 'var(--text-tertiary)',
        backgroundColor: 'transparent',
        border: 'none',
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
