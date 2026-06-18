import { useState } from 'react';
import { AVATAR_PRESETS } from '../utils/AvatarPresets';
import { audioHelper } from '../utils/AudioHelper';

interface AvatarPickerProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  columns?: number;
}

export function AvatarPicker({ selectedId, onSelect, columns = 4 }: AvatarPickerProps) {
  const [showAll, setShowAll] = useState(false);

  const itemsPerRow = columns;
  const initialRows = 3;
  const initialCount = itemsPerRow * initialRows; // 12 items

  const visiblePresets = showAll ? AVATAR_PRESETS : AVATAR_PRESETS.slice(0, initialCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%' }}>
      <div 
        className="avatar-presets-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: '0.8rem',
          width: '100%',
        }}
      >
        {visiblePresets.map((preset) => {
          const isSelected = selectedId === preset.id;
          return (
            <div
              key={preset.id}
              style={{
                width: '100%',
                maxWidth: '56px',
                aspectRatio: '1 / 1',
                margin: '0 auto',
              }}
            >
              <button
                type="button"
                className={`avatar-preset-btn ${isSelected ? 'active' : ''}`}
                style={{ 
                  background: preset.gradient,
                  width: '100%',
                  height: '100%',
                }}
                onClick={() => {
                  audioHelper.playClick();
                  onSelect(preset.id);
                }}
              >
                <span className="avatar-preset-emoji">{preset.emoji}</span>
              </button>
            </div>
          );
        })}
      </div>

      {AVATAR_PRESETS.length > initialCount && (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ 
            padding: '0.4rem 0.8rem', 
            fontSize: '0.75rem', 
            width: 'auto', 
            margin: '0.4rem auto 0 auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.2rem'
          }}
          onClick={() => {
            audioHelper.playClick();
            setShowAll(!showAll);
          }}
        >
          {showAll ? 'Weniger anzeigen' : `Mehr anzeigen (${AVATAR_PRESETS.length - initialCount} weitere)`}
        </button>
      )}
    </div>
  );
}
