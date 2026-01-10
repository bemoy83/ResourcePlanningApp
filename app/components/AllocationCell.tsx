interface AllocationCellProps {
  workCategoryId: string;
  date: string;
  allocation?: { id: string; effortHours: number };
  draft?: {
    key: string;
    effortValue: number;
    effortUnit: "HOURS" | "FTE";
  };
  error?: string;
  onStartEdit(workCategoryId: string, date: string): void;
  onChangeDraft(draftKey: string, effortValue: number, effortUnit: "HOURS" | "FTE"): void;
  onCommit(draftKey: string): void;
  onCancel(draftKey: string): void;
}

export function AllocationCell({
  workCategoryId,
  date,
  allocation,
  draft,
  error,
  onStartEdit,
  onChangeDraft,
  onCommit,
  onCancel,
}: AllocationCellProps) {
  if (draft) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
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
        >
          <option value="HOURS">HOURS</option>
          <option value="FTE">FTE</option>
        </select>

        <button onClick={() => onCommit(draft.key)}>Save</button>
        <button onClick={() => onCancel(draft.key)}>Cancel</button>

        {error && <span>{error}</span>}
      </div>
    );
  }


  if (allocation) {
    return (
      <div onClick={() => onStartEdit(workCategoryId, date)}>
        {allocation.effortHours}
      </div>
    );
  }

  return (
    <div onClick={() => onStartEdit(workCategoryId, date)}>
      -
    </div>
  );
}
