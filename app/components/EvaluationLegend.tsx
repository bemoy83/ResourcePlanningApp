export function EvaluationLegend() {
  const legendItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    fontSize: 'var(--font-size-xs-sm)',
    color: 'var(--text-primary)',
  };

  const indicatorStyle = (bgColor: string) => ({
    width: '20px',
    height: '20px',
    backgroundColor: bgColor,
    border: 'var(--border-width-thick) solid var(--text-secondary)',
  });

  return (
    <div style={{
      padding: 'var(--space-lg)',
      backgroundColor: 'var(--bg-secondary)',
      border: 'var(--border-width-thick) solid var(--border-strong)',
      marginBottom: 'var(--space-lg)',
    }}>
      <h3 style={{ margin: '0 0 var(--space-md) 0', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--text-primary)', borderBottom: 'var(--border-width-thin) solid var(--border-strong)', paddingBottom: 'var(--space-sm)' }}>
        Legend (Advisory Signals)
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
        {/* Work Category Indicators */}
        <div>
          <h4 style={{ margin: '0 0 var(--space-sm) 0', fontSize: 'var(--font-size-xs-sm)', fontWeight: 'var(--font-weight-bold)', color: 'var(--text-primary)' }}>
            Work Category Status
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div style={legendItemStyle}>
              <div style={indicatorStyle('var(--status-warning-light)')} />
              <span>Under deadline pressure</span>
            </div>
            <div style={legendItemStyle}>
              <div style={indicatorStyle('var(--surface-default)')} />
              <span>Normal</span>
            </div>
          </div>
        </div>

        {/* Capacity Indicators */}
        <div>
          <h4 style={{ margin: '0 0 var(--space-sm) 0', fontSize: 'var(--font-size-xs-sm)', fontWeight: 'var(--font-weight-bold)', color: 'var(--text-primary)' }}>
            Daily Capacity Status
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div style={legendItemStyle}>
              <div style={indicatorStyle('var(--capacity-over)')} />
              <span>Over-allocated (demand &gt; capacity)</span>
            </div>
            <div style={legendItemStyle}>
              <div style={indicatorStyle('var(--capacity-under)')} />
              <span>Under-allocated (demand &lt; capacity)</span>
            </div>
            <div style={legendItemStyle}>
              <div style={indicatorStyle('var(--surface-default)')} />
              <span>Balanced or no capacity set</span>
            </div>
          </div>
        </div>

        {/* Cell Status */}
        <div>
          <h4 style={{ margin: '0 0 var(--space-sm) 0', fontSize: 'var(--font-size-xs-sm)', fontWeight: 'var(--font-weight-bold)', color: 'var(--text-primary)' }}>
            Cell Status
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div style={legendItemStyle}>
              <div style={indicatorStyle('var(--surface-progress-track)')} />
              <span>Allocated (click to edit)</span>
            </div>
            <div style={legendItemStyle}>
              <div style={indicatorStyle('var(--surface-default)')} />
              <span>Empty (click to add)</span>
            </div>
          </div>
        </div>

        {/* Remaining Effort */}
        <div>
          <h4 style={{ margin: '0 0 var(--space-sm) 0', fontSize: 'var(--font-size-xs-sm)', fontWeight: 'var(--font-weight-bold)', color: 'var(--text-primary)' }}>
            Remaining Effort
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div style={legendItemStyle}>
              <span style={{ color: 'var(--status-error)', fontWeight: 'var(--font-weight-bold)' }}>-Xh (over)</span>
              <span>Over-allocated (allocated &gt; estimate)</span>
            </div>
            <div style={legendItemStyle}>
              <span style={{ fontWeight: 'var(--font-weight-bold)' }}>Xh</span>
              <span>Remaining work to allocate</span>
            </div>
            <div style={legendItemStyle}>
              <span style={{ color: 'var(--text-tertiary)' }}>—</span>
              <span>Fully allocated</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 'var(--space-md)',
        padding: 'var(--space-sm)',
        backgroundColor: 'var(--bg-secondary)',
        border: 'var(--border-width-thick) solid var(--border-strong)',
        fontSize: 'var(--font-size-xs)',
        fontStyle: 'italic',
        color: 'var(--text-primary)',
      }}>
        Note: All signals are advisory only. The system evaluates but does not prevent any planning decisions.
      </div>
    </div>
  );
}
