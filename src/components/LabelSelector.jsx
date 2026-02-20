import React, { useState } from 'react';
import { X } from 'lucide-react';

const PRESET_LABELS = ['phytolith', 'diatom', 'pollen', 'starch', 'sponge spicule', 'other'];

export default function LabelSelector({ onSelect, onCancel, defaultLabel = 'phytolith' }) {
  const [customLabel, setCustomLabel] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const handlePresetClick = (label) => {
    onSelect(label);
  };

  const handleCustomSubmit = () => {
    if (customLabel.trim()) {
      onSelect(customLabel.trim());
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '500px',
        width: '90%',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '700',
            color: '#f8fafc'
          }}>
            Select Label for This Crop
          </h2>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {!isCustom ? (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '16px'
            }}>
              {PRESET_LABELS.map(label => (
                <button
                  key={label}
                  onClick={() => handlePresetClick(label)}
                  style={{
                    padding: '16px',
                    background: label === defaultLabel 
                      ? 'rgba(99, 102, 241, 0.2)' 
                      : 'rgba(71, 85, 105, 0.2)',
                    border: label === defaultLabel
                      ? '2px solid #6366f1'
                      : '2px solid rgba(71, 85, 105, 0.3)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s',
                    fontFamily: '"Space Mono", monospace'
                  }}
                  onMouseEnter={(e) => {
                    if (label !== defaultLabel) {
                      e.target.style.background = 'rgba(71, 85, 105, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (label !== defaultLabel) {
                      e.target.style.background = 'rgba(71, 85, 105, 0.2)';
                    }
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsCustom(true)}
              style={{
                width: '100%',
                padding: '14px',
                background: 'rgba(139, 92, 246, 0.2)',
                border: '2px solid #8b5cf6',
                borderRadius: '8px',
                color: '#c4b5fd',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontFamily: '"Space Mono", monospace'
              }}
            >
              + Custom Label
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCustomSubmit()}
              placeholder="Enter custom label"
              autoFocus
              style={{
                width: '100%',
                padding: '14px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '2px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '14px',
                marginBottom: '12px',
                fontFamily: '"Space Mono", monospace',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setIsCustom(false)}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'rgba(71, 85, 105, 0.3)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '700',
                  fontFamily: '"Space Mono", monospace'
                }}
              >
                Back
              </button>
              <button
                onClick={handleCustomSubmit}
                disabled={!customLabel.trim()}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: customLabel.trim() 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'rgba(71, 85, 105, 0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  color: customLabel.trim() ? 'white' : '#64748b',
                  cursor: customLabel.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '700',
                  fontFamily: '"Space Mono", monospace'
                }}
              >
                Confirm
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}