export function EvaluationLegend() {
  const legendItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#000',
  };

  const indicatorStyle = (bgColor: string) => ({
    width: '20px',
    height: '20px',
    backgroundColor: bgColor,
    border: '2px solid #333',
  });

  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#f5f5f5',
      border: '2px solid #666',
      marginBottom: '16px',
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', color: '#000', borderBottom: '1px solid #999', paddingBottom: '8px' }}>
        Legend (Advisory Signals)
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Work Category Indicators */}
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#000' }}>
            Work Category Status
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={legendItemStyle}>
              <div style={indicatorStyle('#fff3cd')} />
              <span>Under deadline pressure</span>
            </div>
            <div style={legendItemStyle}>
              <div style={indicatorStyle('#fff')} />
              <span>Normal</span>
            </div>
          </div>
        </div>

        {/* Capacity Indicators */}
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#000' }}>
            Daily Capacity Status
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={legendItemStyle}>
              <div style={indicatorStyle('#fee')} />
              <span>Over-allocated (demand &gt; capacity)</span>
            </div>
            <div style={legendItemStyle}>
              <div style={indicatorStyle('#efe')} />
              <span>Under-allocated (demand &lt; capacity)</span>
            </div>
            <div style={legendItemStyle}>
              <div style={indicatorStyle('#fff')} />
              <span>Balanced or no capacity set</span>
            </div>
          </div>
        </div>

        {/* Cell Status */}
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#000' }}>
            Cell Status
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={legendItemStyle}>
              <div style={indicatorStyle('#e0e0e0')} />
              <span>Allocated (click to edit)</span>
            </div>
            <div style={legendItemStyle}>
              <div style={indicatorStyle('#fff')} />
              <span>Empty (click to add)</span>
            </div>
          </div>
        </div>

        {/* Remaining Effort */}
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#000' }}>
            Remaining Effort
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={legendItemStyle}>
              <span style={{ color: 'red', fontWeight: 'bold' }}>-Xh (over)</span>
              <span>Over-allocated (allocated &gt; estimate)</span>
            </div>
            <div style={legendItemStyle}>
              <span style={{ fontWeight: 'bold' }}>Xh</span>
              <span>Remaining work to allocate</span>
            </div>
            <div style={legendItemStyle}>
              <span style={{ color: '#999' }}>—</span>
              <span>Fully allocated</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '12px',
        padding: '8px',
        backgroundColor: '#f5f5f5',
        border: '2px solid #666',
        fontSize: '11px',
        fontStyle: 'italic',
        color: '#000',
      }}>
        Note: All signals are advisory only. The system evaluates but does not prevent any planning decisions.
      </div>
    </div>
  );
}
