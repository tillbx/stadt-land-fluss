import { useState } from 'react';
import { Users, Copy, Check, Play, UserPlus, Trash, Plus, Share2 } from 'lucide-react';
import type { RoomRecord, PlayerRecord } from '../hooks/useGameRoom';
import { audioHelper } from '../utils/AudioHelper';
import { pb, getPlayerAvatarUrl } from '../pocketbase';

interface GameLobbyProps {
  room: RoomRecord;
  players: PlayerRecord[];
  me: PlayerRecord;
  onUpdateSettings: (settings: any) => Promise<void>;
  onToggleReady: () => Promise<void>;
  onStartRound: () => Promise<void>;
  onLeaveRoom: () => Promise<void>;
}

const CATEGORY_GROUPS = [
  {
    title: 'Klassisch',
    categories: ['Stadt', 'Land', 'Fluss', 'Vorname', 'Tier', 'Pflanze', 'Beruf', 'Essen/Trinken', 'Farbe', 'Gewässer', 'Sportart', 'Kleidungsstück']
  },
  {
    title: 'Modern & Popkultur',
    categories: ['Automarke', 'Promi', 'Film/Serie', 'Modemarke', 'Hobbys', 'Songtitel', 'Videospiel', 'YouTuber', 'Superheld', 'App/Website', 'Gadget']
  },
  {
    title: 'Lustig & Kreativ',
    categories: ['Ausrede', 'Kosename', 'Mordwaffe', 'Körperteil', 'Etwas Gelbes', 'Ein Grund zum Feiern', 'Das macht dick', 'Das riecht gut', 'Das macht man heimlich']
  }
];

export function GameLobby({
  room,
  players,
  me,
  onUpdateSettings,
  onToggleReady,
  onStartRound,
  onLeaveRoom,
}: GameLobbyProps) {
  const [copied, setCopied] = useState(false);
  const [newCat, setNewCat] = useState('');

  const roomCode = (room.code || room.id.substring(0, 6)).toUpperCase();
  const shareUrl = `${window.location.origin}${window.location.pathname}#${roomCode}`;
  const canEdit = me.is_host || me.is_co_host;

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    audioHelper.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    audioHelper.playClick();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Stadt Land Fluss',
          text: 'Komm in meine Stadt Land Fluss Lobby!',
          url: shareUrl,
        });
      } catch (err) {
        console.warn('Native share failed:', err);
      }
    } else {
      copyShareLink();
    }
  };

  const handleCategoryToggle = (cat: string) => {
    if (!canEdit) return;
    audioHelper.playClick();
    let updatedCats = [...room.settings.categories];
    if (updatedCats.includes(cat)) {
      // Keep at least one category
      if (updatedCats.length > 1) {
        updatedCats = updatedCats.filter((c) => c !== cat);
      }
    } else {
      updatedCats.push(cat);
    }
    onUpdateSettings({ categories: updatedCats });
  };

  const handleRandomCategories = (count = 6) => {
    if (!canEdit) return;
    audioHelper.playClick();
    const allCats = CATEGORY_GROUPS.flatMap((g) => g.categories);
    const shuffled = [...allCats].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
    onUpdateSettings({ categories: selected });
  };

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !newCat.trim()) return;
    audioHelper.playClick();
    const formatted = newCat.trim();
    if (!room.settings.categories.includes(formatted)) {
      onUpdateSettings({
        categories: [...room.settings.categories, formatted],
      });
    }
    setNewCat('');
  };

  const handleRemoveCategory = (cat: string) => {
    if (!canEdit || room.settings.categories.length <= 1) return;
    audioHelper.playClick();
    onUpdateSettings({
      categories: room.settings.categories.filter((c) => c !== cat),
    });
  };

  const allReady = players.every((p) => p.is_ready);

  return (
    <div className="fade-in" style={{ width: '100%', maxWidth: '950px' }}>
      <h2 className="lobby-title">
        Spiel-Lobby <span style={{ color: 'var(--primary)' }}>#{roomCode}</span>
      </h2>

      <div className="lobby-grid">
        
        {/* Left Column: Unified player list and sharing card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="glass-card" style={{ padding: '1.5rem', width: '100%', margin: 0, display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {/* Invite Friends */}
            <div>
              <h3 className="section-title" style={{ fontSize: '1.05rem', marginBottom: '0.6rem' }}>
                <UserPlus size={18} /> Freunde einladen
              </h3>
              <div className="share-container" style={{ marginBottom: '0.2rem' }}>
                <span className="room-code-display">{roomCode}</span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem' }} 
                    onClick={copyShareLink}
                    title="Kopieren"
                  >
                    {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                    <span className="btn-text-desktop" style={{ marginLeft: '0.3rem' }}>{copied ? 'Kopiert!' : 'Kopieren'}</span>
                  </button>
                  {typeof navigator !== 'undefined' && typeof navigator.share !== 'undefined' && (
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem' }} 
                      onClick={handleShare}
                      title="Teilen"
                    >
                      <Share2 size={16} />
                      <span className="btn-text-desktop" style={{ marginLeft: '0.3rem' }}>Teilen</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)', margin: '0.1rem 0' }} />

            {/* Players List */}
            <div>
              <h3 className="section-title" style={{ fontSize: '1.05rem', marginBottom: '0.8rem' }}>
                <Users size={18} /> Mitspieler ({players.length})
              </h3>
              <div className="players-list" style={{ marginBottom: '1rem' }}>
                {players.map((p) => (
                  <div key={p.id} className={`player-item ${p.id === me.id ? 'me' : ''}`}>
                    <div className="player-name-wrapper">
                      {p.avatar ? (
                        <img
                          src={getPlayerAvatarUrl(p.user_id!, p.avatar)}
                          alt={p.name}
                          className="player-avatar"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="player-avatar">{p.name[0].toUpperCase()}</div>
                      )}
                      <span className="player-name-text" title={p.name}>
                        {p.name} {p.id === me.id ? ' (Ich)' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      {/* Co-Host Checkbox control for Host */}
                      {me.is_host && !p.is_host && (
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', color: 'var(--text-muted)', cursor: 'pointer' }} title="Diesem Spieler erlauben, die Einstellungen anzupassen.">
                          <input
                            type="checkbox"
                            checked={!!p.is_co_host}
                            onChange={async (e) => {
                              e.stopPropagation();
                              audioHelper.playClick();
                              try {
                                await pb.collection('players').update(p.id, {
                                  is_co_host: !p.is_co_host
                                });
                              } catch (err) {
                                console.error('Failed to update co-host status:', err);
                              }
                            }}
                            style={{ width: '12px', height: '12px', cursor: 'pointer' }}
                          />
                          Co-Host
                        </label>
                      )}
                      {p.is_host && <span className="badge badge-host">Host</span>}
                      {p.is_co_host && !p.is_host && <span className="badge badge-co-host">Co-Host</span>}
                      {p.is_ready ? (
                        <span className="badge badge-ready">Bereit</span>
                      ) : (
                        <span className="badge badge-waiting">Wartet</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions for current player */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <button
                className={`btn ${me.is_ready ? 'btn-secondary' : 'btn-primary'}`}
                onClick={async () => {
                  audioHelper.playClick();
                  await onToggleReady();
                }}
                style={{ width: '100%' }}
              >
                {me.is_ready ? 'Nicht mehr bereit' : 'Bereit erklären'}
              </button>

              {me.is_host && (
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    audioHelper.playStart();
                    await onStartRound();
                  }}
                  disabled={!allReady || players.length === 0}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, var(--success) 0%, hsl(145, 90%, 55%) 100%)',
                    boxShadow: '0 4px 15px var(--success-glow)',
                  }}
                >
                  <Play size={18} /> Spiel starten
                </button>
              )}

              {!allReady && me.is_host && (
                <p style={{ color: 'var(--warning)', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>
                  Warte darauf, dass alle Spieler bereit sind.
                </p>
              )}

              <button
                className="btn btn-secondary"
                onClick={onLeaveRoom}
                style={{ width: '100%', borderColor: 'rgba(239, 35, 60, 0.2)', color: 'var(--danger)' }}
              >
                Raum verlassen
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="glass-card" style={{ padding: '2rem', width: '100%', margin: 0 }}>
          <h3 className="section-title">Spiel-Einstellungen</h3>

          {/* Rounds */}
          <div className="form-group">
            <label className="form-label" htmlFor="rounds-select">
              Rundenanzahl <span>{room.settings.maxRounds} Runden</span>
            </label>
            <select
              id="rounds-select"
              className="form-input"
              value={room.settings.maxRounds}
              disabled={!canEdit}
              onChange={(e) => {
                audioHelper.playClick();
                onUpdateSettings({ maxRounds: Number(e.target.value) });
              }}
            >
              <option value={3}>3 Runden</option>
              <option value={5}>5 Runden</option>
              <option value={10}>10 Runden</option>
              <option value={15}>15 Runden</option>
            </select>
          </div>

          {/* Round Duration */}
          <div className="form-group">
            <label className="form-label" htmlFor="duration-select">
              Runden-Timer <span>{room.settings.duration === 0 ? 'Kein Limit' : `${room.settings.duration} Sek.`}</span>
            </label>
            <select
              id="duration-select"
              className="form-input"
              value={room.settings.duration}
              disabled={!canEdit}
              onChange={(e) => {
                audioHelper.playClick();
                onUpdateSettings({ duration: Number(e.target.value) });
              }}
            >
              <option value={0}>Kein Zeitlimit (nur "Stopp"-Button)</option>
              <option value={30}>30 Sekunden</option>
              <option value={45}>45 Sekunden</option>
              <option value={60}>60 Sekunden</option>
              <option value={90}>90 Sekunden</option>
              <option value={120}>2 Minuten</option>
              <option value={150}>2,5 Minuten</option>
              <option value={180}>3 Minuten</option>
            </select>
          </div>

          {/* Stop Mode */}
          <div className="form-group">
            <label className="form-label" htmlFor="stop-mode-select">Runden-Ende</label>
            <select
              id="stop-mode-select"
              className="form-input"
              value={room.settings.stopMode}
              disabled={!canEdit}
              onChange={(e) => {
                audioHelper.playClick();
                onUpdateSettings({ stopMode: e.target.value });
              }}
            >
              <option value="countdown">10 Sekunden Countdown, sobald jemand fertig ist</option>
              <option value="instant">Runde endet sofort, sobald jemand fertig ist</option>
            </select>
          </div>

          {/* Spelling Check Toggle */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <div
              className={`checkbox-card ${room.settings.validateFirstLetter !== false ? 'checked' : ''}`}
              style={{ width: '100%', margin: 0, padding: '0.8rem 1rem', cursor: canEdit ? 'pointer' : 'default' }}
              onClick={() => {
                if (!canEdit) return;
                audioHelper.playClick();
                onUpdateSettings({ validateFirstLetter: room.settings.validateFirstLetter === false ? true : false });
              }}
            >
              <div className="checkbox-custom" />
              <span className="checkbox-label" style={{ whiteSpace: 'normal', fontSize: '0.85rem' }}>
                <strong>Anfangsbuchstaben prüfen</strong><br />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Einträge müssen mit dem gezogenen Buchstaben beginnen.
                </span>
              </span>
            </div>
          </div>

          {/* Categories configuration */}
          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ marginBottom: '0.8rem', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem' }}>
              Kategorien ({room.settings.categories.length})
            </h4>

            {/* Selected Categories */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.2rem' }}>
              {room.settings.categories.map((cat) => (
                <span
                  key={cat}
                  style={{
                    background: 'var(--primary-glow)',
                    border: '1px solid var(--primary)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {cat}
                  {canEdit && room.settings.categories.length > 1 && (
                    <Trash
                      size={14}
                      style={{ cursor: 'pointer', color: 'var(--danger)' }}
                      onClick={() => handleRemoveCategory(cat)}
                    />
                  )}
                </span>
              ))}
            </div>

            {/* Preset Toggle Options (Host and Co-Host only) */}
            {canEdit && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    Kategorien ein-/ausschalten:
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleRandomCategories(6)}
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                  >
                    🎲 6 Zufällige würfeln
                  </button>
                </div>
                {CATEGORY_GROUPS.map((group) => (
                  <div key={group.title} style={{ marginBottom: '1rem' }}>
                    <h5 style={{ fontSize: '0.85rem', color: 'var(--accent)', marginBottom: '0.4rem', fontWeight: 600 }}>
                      {group.title}
                    </h5>
                    <div className="settings-grid">
                      {group.categories.map((cat) => {
                        const isChecked = room.settings.categories.includes(cat);
                        return (
                          <div
                            key={cat}
                            className={`checkbox-card ${isChecked ? 'checked' : ''}`}
                            onClick={() => handleCategoryToggle(cat)}
                          >
                            <div className="checkbox-custom" />
                            <span className="checkbox-label" title={cat}>{cat}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Category Input (Host and Co-Host only) */}
            {canEdit && (
              <form onSubmit={handleAddCustomCategory} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.9rem', padding: '0.5rem 0.8rem' }}
                  placeholder="Eigene Kategorie hinzufügen..."
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  maxLength={20}
                />
                <button type="submit" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                  <Plus size={18} />
                </button>
              </form>
            )}

            {/* Letters Pool Selection */}
            <div style={{ marginTop: '2rem' }}>
              <h4 style={{ marginBottom: '0.8rem', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem' }}>
                Buchstaben-Pool ({(room.settings.lettersPool || []).length})
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
                {canEdit 
                  ? 'Wähle aus, welche Buchstaben im Spiel gezogen werden können:' 
                  : 'Diese Buchstaben können im Spiel gezogen werden:'}
              </p>
              <div className="letters-pool-grid">
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => {
                  const isIncluded = (room.settings.lettersPool || []).includes(letter);
                  return (
                    <button
                      key={letter}
                      type="button"
                      className={`letter-toggle-btn ${isIncluded ? 'active' : ''}`}
                      disabled={!canEdit}
                      onClick={() => {
                        audioHelper.playClick();
                        let pool = room.settings.lettersPool ? [...room.settings.lettersPool] : [];
                        if (isIncluded) {
                          if (pool.length > 1) {
                            pool = pool.filter((l) => l !== letter);
                          }
                        } else {
                          pool.push(letter);
                          pool.sort();
                        }
                        onUpdateSettings({ lettersPool: pool });
                      }}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
