interface WorkCategory {
  id: string;
  name: string;
  estimatedEffortHours: number;
}

interface Allocation {
  workCategoryId: string;
  effortHours: number;
}

interface WorkCategoryPressure {
  workCategoryId: string;
  remainingEffortHours: number;
  remainingDays: number;
  isUnderPressure: boolean;
}

interface DailyCapacityComparison {
  date: string;
  demandHours: number;
  capacityHours: number;
  isOverAllocated: boolean;
  isUnderAllocated: boolean;
}

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
    padding: '12px',
    backgroundColor: '#fff',
    border: '2px solid #999',
  };

  const metricLabelStyle = {
    fontSize: '11px',
    color: '#333',
    marginBottom: '4px',
  };

  const metricValueStyle = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#000',
  };

  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#f5f5f5',
      border: '2px solid #666',
      marginBottom: '16px',
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', color: '#000', borderBottom: '1px solid #999', paddingBottom: '8px' }}>
        Planning Summary
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
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
            color: totalRemaining < 0 ? 'red' : totalRemaining > 0 ? 'orange' : 'green',
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
            marginTop: '4px',
            height: '8px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${Math.min(completionPercentage, 100)}%`,
              height: '100%',
              backgroundColor: completionPercentage >= 100 ? '#4caf50' : '#2196f3',
            }} />
          </div>
        </div>

        {/* Pressure Indicators */}
        <div style={metricStyle}>
          <div style={metricLabelStyle}>Work Categories</div>
          <div style={metricValueStyle}>{workCategories.length}</div>
          {categoriesUnderPressure > 0 && (
            <div style={{ fontSize: '11px', color: '#f57c00', marginTop: '4px' }}>
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
                color: overAllocatedDays > 0 ? 'red' : 'green',
              }}>
                {overAllocatedDays}
              </div>
            </div>

            <div style={metricStyle}>
              <div style={metricLabelStyle}>Under-Allocated Days</div>
              <div style={{
                ...metricValueStyle,
                color: underAllocatedDays > 0 ? 'green' : '#666',
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
