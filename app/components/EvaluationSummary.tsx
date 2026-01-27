import {
  WorkCategory,
  Allocation,
  WorkCategoryPressure,
  DailyCapacityComparison,
} from '../types/shared';

interface EvaluationSummaryProps {
  workCategories: WorkCategory[];
  allocations: Allocation[];
  workCategoryPressure: WorkCategoryPressure[];
  dailyCapacityComparison: DailyCapacityComparison[];
}

export function EvaluationSummary({
  workCategories,
  allocations,
  workCategoryPressure,
  dailyCapacityComparison,
}: EvaluationSummaryProps) {
  // Calculate totals
  const totalEstimated = workCategories.reduce((sum, wc) => sum + wc.estimatedEffortHours, 0);
  const totalAllocated = allocations.reduce((sum, a) => sum + a.effortHours, 0);
  const totalRemaining = totalEstimated - totalAllocated;

  // Count categories under pressure
  const categoriesUnderPressure = workCategoryPressure.filter(p => p.isUnderPressure).length;

  // Count over/under allocated days
  const overAllocatedDays = dailyCapacityComparison.filter(d => d.isOverAllocated).length;
  const underAllocatedDays = dailyCapacityComparison.filter(d => d.isUnderAllocated).length;
  const daysWithCapacity = dailyCapacityComparison.filter(d => d.capacityHours > 0).length;

  // Calculate completion percentage
  const completionPercentage = totalEstimated > 0
    ? Math.round((totalAllocated / totalEstimated) * 100)
    : 0;

  const metricStyle = {
    padding: 'var(--space-md)',
    backgroundColor: 'var(--surface-default)',
    border: 'var(--border-width-thick) solid var(--border-strong)',
  };

  const metricLabelStyle = {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-xs)',
  };

  const metricValueStyle = {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--text-primary)',
  };

  return (
    <div style={{
      padding: 'var(--space-lg)',
      backgroundColor: 'var(--bg-secondary)',
      border: 'var(--border-width-thick) solid var(--border-strong)',
      marginBottom: 'var(--space-lg)',
    }}>
      <h3 style={{ margin: '0 0 var(--space-md) 0', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--text-primary)', borderBottom: 'var(--border-width-thin) solid var(--border-strong)', paddingBottom: 'var(--space-sm)' }}>
        Planning Summary
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-md)' }}>
        {/* Total Effort */}
        <div style={metricStyle}>
          <div style={metricLabelStyle}>Total Estimated</div>
          <div style={metricValueStyle}>{totalEstimated}h</div>
        </div>

        <div style={metricStyle}>
          <div style={metricLabelStyle}>Total Allocated</div>
          <div style={metricValueStyle}>{totalAllocated}h</div>
        </div>

        <div style={metricStyle}>
          <div style={metricLabelStyle}>Remaining</div>
          <div style={{
            ...metricValueStyle,
            color: totalRemaining < 0 ? 'var(--status-error)' : totalRemaining > 0 ? 'var(--status-warning)' : 'var(--status-success)',
          }}>
            {totalRemaining}h
            {totalRemaining < 0 && ' (over)'}
          </div>
        </div>

        <div style={metricStyle}>
          <div style={metricLabelStyle}>Completion</div>
          <div style={metricValueStyle}>
            {completionPercentage}%
          </div>
          <div style={{
            marginTop: 'var(--space-xs)',
            height: 'var(--space-sm)',
            backgroundColor: 'var(--surface-progress-track)',
            borderRadius: 'var(--radius-xs)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${Math.min(completionPercentage, 100)}%`,
              height: '100%',
              backgroundColor: completionPercentage >= 100 ? 'var(--status-success)' : 'var(--status-info)',
            }} />
          </div>
        </div>

        {/* Pressure Indicators */}
        <div style={metricStyle}>
          <div style={metricLabelStyle}>Work Categories</div>
          <div style={metricValueStyle}>{workCategories.length}</div>
          {categoriesUnderPressure > 0 && (
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--status-warning)', marginTop: 'var(--space-xs)' }}>
              {categoriesUnderPressure} under pressure
            </div>
          )}
        </div>

        {/* Capacity Status */}
        {daysWithCapacity > 0 && (
          <>
            <div style={metricStyle}>
              <div style={metricLabelStyle}>Days with Capacity</div>
              <div style={metricValueStyle}>{daysWithCapacity}</div>
            </div>

            <div style={metricStyle}>
              <div style={metricLabelStyle}>Over-Allocated Days</div>
              <div style={{
                ...metricValueStyle,
                color: overAllocatedDays > 0 ? 'var(--status-error)' : 'var(--status-success)',
              }}>
                {overAllocatedDays}
              </div>
            </div>

            <div style={metricStyle}>
              <div style={metricLabelStyle}>Under-Allocated Days</div>
              <div style={{
                ...metricValueStyle,
                color: underAllocatedDays > 0 ? 'var(--status-success)' : 'var(--text-secondary)',
              }}>
                {underAllocatedDays}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
