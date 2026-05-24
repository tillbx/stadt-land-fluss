import React, { useState, useEffect } from 'react';
import { LogIn, Sparkles, History, Trophy, User, LogOut, Camera, Mail, Lock } from 'lucide-react';
import { audioHelper } from '../utils/AudioHelper';
import { pb } from '../pocketbase';

interface LandingPageProps {
  onCreateRoom: (name: string, customCategories?: string[]) => void;
  onJoinRoom: (roomId: string, name: string) => void;
  isConnecting: boolean;
  error: string | null;
  user: any;
  onRegister: (email: string, password: string, displayName?: string, avatarFile?: File | null) => Promise<void>;
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => void;
  onUpdateProfile: (displayName: string, avatarFile: File | null) => Promise<any>;
}

export function LandingPage({
  onCreateRoom,
  onJoinRoom,
  isConnecting,
  error,
  user,
  onRegister,
  onLogin,
  onLogout,
  onUpdateProfile
}: LandingPageProps) {
  // Common state
  const [name, setName] = useState(() => localStorage.getItem('slf_player_name') || '');
  const [roomCode, setRoomCode] = useState('');
  const [isInvited, setIsInvited] = useState(false);

  // Logged-out layout state
  const [authTab, setAuthTab] = useState<'guest' | 'auth'>('guest');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Mobile layout state ('play' vs 'dashboard')
  const [mobileTab, setMobileTab] = useState<'play' | 'dashboard'>('play');

  // Auth Form State
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authAvatar, setAuthAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Profile Edit State
  const [updateName, setUpdateName] = useState('');
  const [updateAvatar, setUpdateAvatar] = useState<File | null>(null);
  const [updateAvatarPreview, setUpdateAvatarPreview] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  // Dashboard state
  const [activeDashboardTab, setActiveDashboardTab] = useState<'stats' | 'history' | 'leaderboard'>('stats');
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [leaderboardList, setLeaderboardList] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Extract room code from URL hash (e.g., #ROOMCODE)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const code = hash.substring(1).toUpperCase();
      setRoomCode(code);
      setIsInvited(true);
    }
  }, []);

  // Sync player name from authenticated user details if logged in
  useEffect(() => {
    if (user) {
      const displayName = user.name || user.username || '';
      if (displayName) {
        setName(displayName);
        localStorage.setItem('slf_player_name', displayName);
      }
      setUpdateName(user.name || '');
    }
  }, [user]);

  // Object URL generator for registration avatar preview
  useEffect(() => {
    if (authAvatar) {
      const url = URL.createObjectURL(authAvatar);
      setAvatarPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setAvatarPreview(null);
  }, [authAvatar]);

  // Object URL generator for profile update avatar preview
  useEffect(() => {
    if (updateAvatar) {
      const url = URL.createObjectURL(updateAvatar);
      setUpdateAvatarPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setUpdateAvatarPreview(null);
  }, [updateAvatar]);

  const loadHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const res = await pb.collection('match_history').getList(1, 50, {
        filter: `players ~ "${user.id}"`,
        sort: '-ended_at',
      });
      setHistoryList(res.items);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    setLeaderboardLoading(true);
    try {
      const res = await pb.collection('users').getList(1, 20, {
        filter: 'points_total > 0',
        sort: '-points_total',
      });
      setLeaderboardList(res.items);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // Load history and leaderboard automatically on tab change
  useEffect(() => {
    if (user) {
      if (activeDashboardTab === 'history') {
        loadHistory();
      } else if (activeDashboardTab === 'leaderboard') {
        loadLeaderboard();
      }
    }
  }, [activeDashboardTab, user?.id]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    localStorage.setItem('slf_player_name', val);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    audioHelper.playClick();
    onCreateRoom(name.trim(), undefined);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roomCode.trim()) return;
    audioHelper.playClick();
    onJoinRoom(roomCode.trim().toUpperCase(), name.trim());
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      if (isRegisterMode) {
        await onRegister(authEmail.trim(), authPassword, authName.trim(), authAvatar);
      } else {
        await onLogin(authEmail.trim(), authPassword);
      }
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
      setAuthAvatar(null);
      setAuthTab('guest'); // Reset logged out tabs
    } catch (err: any) {
      setAuthError(err.message || 'Authentifizierung fehlgeschlagen.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);
    setUpdateSuccess(false);
    setUpdateLoading(true);
    try {
      await onUpdateProfile(updateName.trim(), updateAvatar);
      setUpdateSuccess(true);
      setUpdateAvatar(null);
    } catch (err: any) {
      setUpdateError(err.message || 'Profil-Update fehlgeschlagen.');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Generate some random floating background letters
  const [floatingLetters, setFloatingLetters] = useState<{ id: number; char: string; left: number; delay: number; duration: number }[]>([]);
  useEffect(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const list = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      char: chars[Math.floor(Math.random() * chars.length)],
      left: Math.random() * 95,
      delay: Math.random() * 8,
      duration: 10 + Math.random() * 15,
    }));
    setFloatingLetters(list);
  }, []);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoString;
    }
  };

  const getAvatarSource = (userObj: any) => {
    if (userObj && userObj.avatar) {
      return pb.files.getUrl(userObj, userObj.avatar);
    }
    return '';
  };

  // Renders the registration/login form explicitly
  const renderAuthForms = () => {
    return (
      <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', animation: 'fadeIn 0.3s ease-out' }}>
        <h3 style={{ textShadow: '0 0 10px var(--primary-glow)', color: 'var(--primary)', fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.2rem', textAlign: 'center' }}>
          {isRegisterMode ? 'Konto erstellen' : 'Im Account anmelden'}
        </h3>
        
        {authError && (
          <div style={{ background: 'var(--danger-glow)', border: '1px solid var(--danger)', padding: '0.8rem', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center' }}>
            {authError}
          </div>
        )}

        {isRegisterMode && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
            {/* Styled Avatar Upload Circle */}
            <div style={{ position: 'relative', width: '80px', height: '80px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: '2px dashed var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.02)',
                boxShadow: '0 0 15px var(--primary-glow)',
                cursor: 'pointer'
              }}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Camera size={26} color="var(--primary)" />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setAuthAvatar(e.target.files[0]);
                  }
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: 2
                }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Profilbild hochladen (optional)</span>

            <div className="form-group" style={{ width: '100%', textAlign: 'left' }}>
              <label className="form-label">Spielername (Anzeigename)</label>
              <input
                type="text"
                className="form-input"
                placeholder="z. B. Max"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                maxLength={10}
              />
            </div>
          </div>
        )}

        <div className="form-group" style={{ textAlign: 'left' }}>
          <label className="form-label">E-Mail-Adresse</label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="email"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              required
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="name@beispiel.de"
            />
          </div>
        </div>

        <div className="form-group" style={{ textAlign: 'left' }}>
          <label className="form-label">Passwort</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="password"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              required
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={authLoading}
          style={{ width: '100%', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          {authLoading ? (
            'Bitte warten...'
          ) : (
            <>
              <LogIn size={18} /> {isRegisterMode ? 'Registrieren' : 'Anmelden'}
            </>
          )}
        </button>

        <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setAuthError(null);
            }}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
          >
            {isRegisterMode ? 'Bereits ein Konto? Hier einloggen' : 'Noch kein Konto? Jetzt registrieren'}
          </button>
        </div>
      </form>
    );
  };

  // Render player stats dashboard
  const renderStatsDashboard = () => {
    const games = user.games_total || 0;
    const wins = user.wins_total || 0;
    const points = user.points_total || 0;
    const winRate = games > 0 ? Math.round((wins / games) * 100) : 0;
    const avgPoints = games > 0 ? Math.round(points / games) : 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
        
        {/* Win Rate Progress Meter */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-glass)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            <span>GEWINNRATE</span>
            <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{winRate}%</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${winRate}%`,
              background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)',
              boxShadow: '0 0 10px var(--primary-glow)',
              transition: 'width 0.8s cubic-bezier(0.25, 0.8, 0.25, 1)'
            }} />
          </div>
        </div>

        {/* Numeric stats grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.8rem'
        }}>
          <div className="stat-card" style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            textAlign: 'center',
            boxShadow: '0 0 10px rgba(157, 78, 221, 0.05)',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spiele</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '0.2rem', color: 'var(--text-main)', textShadow: '0 0 5px rgba(255,255,255,0.1)' }}>{games}</div>
          </div>

          <div className="stat-card" style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            textAlign: 'center',
            boxShadow: '0 0 10px rgba(244, 143, 177, 0.05)',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Siege</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '0.2rem', color: 'var(--secondary)', textShadow: '0 0 8px var(--secondary-glow)' }}>{wins}</div>
          </div>

          <div className="stat-card" style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            textAlign: 'center',
            boxShadow: '0 0 10px rgba(0, 245, 212, 0.05)',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Punkte Ges.</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '0.2rem', color: 'var(--accent)', textShadow: '0 0 10px rgba(0, 245, 212, 0.1)' }}>{points}</div>
          </div>

          <div className="stat-card" style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            textAlign: 'center',
            boxShadow: '0 0 10px rgba(157, 78, 221, 0.05)',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ø-Punkte</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '0.2rem', color: 'var(--text-main)' }}>{avgPoints}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderHistoryDashboard = () => {
    if (historyLoading) {
      return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Lade Spielverlauf...</div>;
    }

    if (historyList.length === 0) {
      return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Noch keine Spiele absolviert.</div>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', overflowY: 'auto', maxHeight: '42vh', paddingRight: '0.2rem', animation: 'fadeIn 0.3s ease-out' }}>
        {historyList.map((match) => {
          const meInMatch = match.players.find((p: any) => p.user_id === user.id);
          const isWinner = meInMatch?.rank === 1;
          
          return (
            <div
              key={match.id}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${isWinner ? 'var(--success)' : 'var(--border-glass)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '0.8rem',
                position: 'relative',
                boxShadow: isWinner ? '0 0 10px var(--success-glow)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--accent)' }}>Raum #{match.code}</span>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.15rem 0.4rem',
                  borderRadius: '1rem',
                  fontWeight: 700,
                  background: isWinner ? 'var(--success-glow)' : 'rgba(255,255,255,0.05)',
                  color: isWinner ? 'var(--success)' : 'var(--text-muted)',
                  border: `1px solid ${isWinner ? 'var(--success)' : 'transparent'}`
                }}>
                  {isWinner ? '🏆 Sieg' : `${meInMatch?.rank || '?'}. Platz`}
                </span>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                {formatDate(match.ended_at)} | {match.rounds} Runden
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                <tbody>
                  {match.players.slice(0, 3).map((p: any, idx: number) => (
                    <tr
                      key={idx}
                      style={{
                        color: p.user_id === user.id ? 'var(--primary)' : 'var(--text-main)',
                        fontWeight: p.user_id === user.id ? 700 : 400
                      }}
                    >
                      <td style={{ padding: '0.15rem 0' }}>{p.rank}. {p.name}</td>
                      <td style={{ padding: '0.15rem 0', textAlign: 'right' }}>{p.points} Pkt.</td>
                    </tr>
                  ))}
                  {match.players.length > 3 && (
                    <tr>
                      <td colSpan={2} style={{ padding: '0.15rem 0', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        ...und {match.players.length - 3} weitere Spieler
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLeaderboardDashboard = () => {
    if (leaderboardLoading) {
      return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Lade Bestenliste...</div>;
    }

    if (leaderboardList.length === 0) {
      return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Keine Einträge in der Bestenliste.</div>;
    }

    return (
      <div style={{ overflowY: 'auto', maxHeight: '42vh', paddingRight: '0.2rem', animation: 'fadeIn 0.3s ease-out' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.4rem 0.2rem' }}>Pl.</th>
              <th style={{ padding: '0.4rem 0.4rem' }}>Spieler</th>
              <th style={{ padding: '0.4rem 0.4rem', textAlign: 'center' }}>Siege</th>
              <th style={{ padding: '0.4rem 0.2rem', textAlign: 'right' }}>Punkte</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardList.map((u: any, idx: number) => {
              const rank = idx + 1;
              const isMe = user && u.id === user.id;
              
              return (
                <tr
                  key={u.id}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    color: isMe ? 'var(--primary)' : 'var(--text-main)',
                    fontWeight: isMe ? 700 : 400,
                    background: isMe ? 'rgba(157, 78, 221, 0.03)' : 'none'
                  }}
                >
                  <td style={{ padding: '0.5rem 0.2rem', verticalAlign: 'middle' }}>
                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`}
                  </td>
                  <td style={{ padding: '0.5rem 0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem', verticalAlign: 'middle' }}>
                    {u.avatar ? (
                      <img
                        src={pb.files.getUrl(u, u.avatar)}
                        alt="Avatar"
                        style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.65rem'
                      }}>
                        {(u.name || u.username || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80px' }}>
                      {u.name || u.username}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem 0.4rem', textAlign: 'center', verticalAlign: 'middle' }}>{u.wins_total || 0}</td>
                  <td style={{ padding: '0.5rem 0.2rem', textAlign: 'right', verticalAlign: 'middle', fontWeight: 800 }}>{u.points_total || 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Large circular avatar with update click trigger
  const renderUserProfileColumn = () => {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-glass)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: 'var(--shadow-glow)',
      }}>
        {/* Avatar Upload Dropzone Frame */}
        <div style={{ position: 'relative', width: '100px', height: '100px' }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid var(--primary)',
            boxShadow: '0 0 20px var(--primary-glow)',
            background: 'var(--bg-dark)',
            position: 'relative'
          }}>
            {updateAvatarPreview ? (
              <img src={updateAvatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : user.avatar ? (
              <img src={getAvatarSource(user)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: 'white', fontSize: '2.5rem', fontWeight: 'bold' }}>
                {(user.name || user.username || '?')[0].toUpperCase()}
              </div>
            )}
            
            {/* Edit overlay */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(0,0,0,0.6)',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease',
            }}>
              <Camera size={14} color="white" />
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                setUpdateAvatar(e.target.files[0]);
              }
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              zIndex: 2
            }}
          />
        </div>

        {/* Display name inline editor */}
        <form onSubmit={handleUpdateProfile} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {updateError && (
            <div style={{ background: 'var(--danger-glow)', border: '1px solid var(--danger)', padding: '0.4rem', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '0.75rem', textAlign: 'center' }}>
              {updateError}
            </div>
          )}
          {updateSuccess && (
            <div style={{ background: 'rgba(0, 255, 100, 0.1)', border: '1px solid #00ff64', padding: '0.4rem', borderRadius: 'var(--radius-sm)', color: '#00ff64', fontSize: '0.75rem', textAlign: 'center' }}>
              Aktualisiert!
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              value={updateName}
              onChange={(e) => setUpdateName(e.target.value)}
              maxLength={10}
              required
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem', flex: 1 }}
              placeholder="Spielername"
            />
            {(updateName !== (user.name || '') || updateAvatar) && (
              <button
                type="submit"
                disabled={updateLoading}
                className="btn btn-primary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                {updateLoading ? '...' : 'Sichern'}
              </button>
            )}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            {user.email}
          </span>
        </form>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onLogout}
          style={{
            padding: '0.4rem 1rem',
            fontSize: '0.8rem',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            background: 'none',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.3rem'
          }}
        >
          <LogOut size={14} /> Abmelden
        </button>
      </div>
    );
  };

  // Helper styles for tab selectors
  const loggedOutTabStyle = (isActive: boolean) => ({
    flex: 1,
    padding: '0.8rem',
    background: isActive ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
    border: 'none',
    borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
    color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none'
  });

  const dashboardTabStyle = (isActive: boolean) => ({
    flex: 1,
    padding: '0.5rem 0.2rem',
    background: isActive ? 'var(--primary)' : 'rgba(255, 255, 255, 0.02)',
    border: '1px solid ' + (isActive ? 'var(--primary)' : 'var(--border-glass)'),
    color: isActive ? 'white' : 'var(--text-muted)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: isActive ? '0 0 10px var(--primary-glow)' : 'none',
    transition: 'all 0.2s ease',
  });

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '0 0.5rem' }}>
      
      {/* Dynamic Background Floating Letters */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: -1, opacity: 0.05 }}>
        {floatingLetters.map((l) => (
          <span
            key={l.id}
            style={{
              position: 'absolute',
              top: '-10%',
              left: `${l.left}%`,
              fontSize: '3.5rem',
              fontWeight: 900,
              fontFamily: 'var(--font-title)',
              color: 'var(--primary)',
              animation: `fall ${l.duration}s linear infinite`,
              animationDelay: `${l.delay}s`,
            }}
          >
            {l.char}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(115vh) rotate(360deg); opacity: 0; }
        }
        .lobby-grid-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 1.5rem;
          margin-top: 1.5rem;
        }
        .dashboard-tab-content {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-lg);
          padding: 1.2rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-glow);
        }
        @media (max-width: 800px) {
          .lobby-grid-layout {
            grid-template-columns: 1fr;
            gap: 1.2rem;
          }
        }
      `}</style>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '1.2rem', marginTop: '1rem' }}>
        <h1 className="gradient-title" style={{ fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
          Stadt Land Fluss
        </h1>
        <p className="subtitle" style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
          Der multiplayer Klassiker im modernen Gewand
        </p>
      </div>

      {error && (
        <div style={{
          background: 'var(--danger-glow)',
          border: '1px solid var(--danger)',
          padding: '0.8rem 1.2rem',
          borderRadius: 'var(--radius-md)',
          color: 'var(--danger)',
          fontSize: '0.9rem',
          marginBottom: '1rem',
          textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      {/* Invited Screen overrides everything */}
      {isInvited ? (
        <div className="glass-card fade-in" style={{ maxWidth: '500px', margin: '2rem auto', textAlign: 'center', padding: '2rem' }}>
          <p className="subtitle" style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Du wurdest zu einer Spielrunde eingeladen!</p>
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '100%' }}>
            <h3 style={{ marginBottom: '0.2rem' }}>Spiel beitreten</h3>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: 900, 
              color: 'var(--accent)', 
              letterSpacing: '0.1em',
              marginBottom: '1rem',
              textShadow: '0 0 15px var(--primary-glow)'
            }}>
              #{roomCode}
            </div>

            <div className="form-group" style={{ textAlign: 'left', marginBottom: '1rem' }}>
              <label className="form-label">Dein Spielername</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={handleNameChange}
                maxLength={10}
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={!name.trim() || isConnecting}
              style={{ width: '100%' }}
            >
              {isConnecting ? 'Tritt bei...' : 'Jetzt mitspielen'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                window.location.hash = '';
                setRoomCode('');
                setIsInvited(false);
              }}
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.6rem', marginTop: '0.5rem' }}
            >
              Abbrechen & Spielhalle öffnen
            </button>
          </form>
        </div>
      ) : (
        /* Logged Out View vs. Logged In Lobby Dashboard */
        !user ? (
          <div className="glass-card fade-in" style={{ maxWidth: '550px', margin: '1rem auto 3rem auto', overflow: 'hidden', padding: 0 }}>
            {/* Header Tabs for Gast vs Konto */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)' }}>
              <button
                type="button"
                onClick={() => setAuthTab('guest')}
                style={loggedOutTabStyle(authTab === 'guest')}
              >
                <Sparkles size={14} style={{ marginRight: '0.4rem', display: 'inline', verticalAlign: 'middle' }} />
                Als Gast spielen
              </button>
              <button
                type="button"
                onClick={() => setAuthTab('auth')}
                style={loggedOutTabStyle(authTab === 'auth')}
              >
                <LogIn size={14} style={{ marginRight: '0.4rem', display: 'inline', verticalAlign: 'middle' }} />
                Profil & Anmelden
              </button>
            </div>

            <div style={{ padding: '2rem' }}>
              {authTab === 'guest' ? (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">Dein Spielername</label>
                    <input
                      type="text"
                      className="form-input"
                      value={name}
                      onChange={handleNameChange}
                      maxLength={10}
                      required
                      placeholder="z. B. GastSpieler"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
                    {/* Create Room */}
                    <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>
                        <Sparkles size={16} color="var(--primary)" /> Neues Spiel
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', flex: 1 }}>
                        Lobby mit individuellen Regeln und Kategorien starten.
                      </p>
                      <button
                        type="button"
                        onClick={handleCreate}
                        disabled={!name.trim() || isConnecting}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                      >
                        Raum erstellen
                      </button>
                    </div>

                    {/* Join Room */}
                    <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>
                        <LogIn size={16} color="var(--secondary)" /> Beitreten
                      </h4>
                      <div className="form-group" style={{ marginBottom: '0.8rem' }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '0.4rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}
                          placeholder="CODE EINGEBEN"
                          value={roomCode}
                          onChange={(e) => setRoomCode(e.target.value)}
                          maxLength={6}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleJoin}
                        disabled={!name.trim() || !roomCode.trim() || isConnecting}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem', fontSize: '0.85rem', marginTop: 'auto' }}
                      >
                        Teilnehmen
                      </button>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Hinweis: Als Gast werden keine Statistiken oder Matchverläufe im Leaderboard erfasst.
                  </div>
                </div>
              ) : (
                renderAuthForms()
              )}
            </div>
          </div>
        ) : (
          /* Logged In Premium Dashboard Grid */
          <div>
            {/* Mobile View Toggle Buttons */}
            <div className="btn-text-desktop" style={{ display: 'none' }} />
            <div style={{
              display: 'none',
              gap: '0.5rem',
              marginBottom: '1rem'
            }} id="mobile-tabs-container">
              <button
                type="button"
                className={`btn ${mobileTab === 'play' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMobileTab('play')}
                style={{ flex: 1, padding: '0.5rem' }}
              >
                🎮 Spielen
              </button>
              <button
                type="button"
                className={`btn ${mobileTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMobileTab('dashboard')}
                style={{ flex: 1, padding: '0.5rem' }}
              >
                📊 Stats & Profile
              </button>
            </div>
            
            <style>{`
              @media (max-width: 650px) {
                #mobile-tabs-container {
                  display: flex !important;
                }
                .mobile-col-hide {
                  display: none !important;
                }
                .mobile-col-show {
                  display: flex !important;
                }
              }
            `}</style>

            <div className="lobby-grid-layout">
              {/* Left Column: Profile Card & Play Card */}
              <div
                className={`lobby-left-col ${mobileTab === 'play' ? 'mobile-col-show' : 'mobile-col-hide'}`}
                style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
              >
                {/* Profile detail */}
                {renderUserProfileColumn()}

                {/* Play actions */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: 'var(--shadow-glow)',
                }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)' }}>
                    <Sparkles size={18} color="var(--primary)" /> Spiel starten
                  </h3>
                  
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={isConnecting}
                    className="btn btn-primary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <Sparkles size={16} /> Raum erstellen
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.8rem' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Lobby Code beitreten</label>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '0.4rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', flex: 1 }}
                        placeholder="CODE"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value)}
                        maxLength={6}
                      />
                      <button
                        type="button"
                        onClick={handleJoin}
                        disabled={!roomCode.trim() || isConnecting}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem' }}
                      >
                        Join
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Statistics, Match History & Leaderboard Dashboard */}
              <div
                className={`lobby-right-col ${mobileTab === 'dashboard' ? 'mobile-col-show' : 'mobile-col-hide'}`}
                style={{ display: 'flex', flexDirection: 'column' }}
              >
                <div className="dashboard-tab-content">
                  {/* Dashboard Tab Bar */}
                  <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1.2rem' }}>
                    <button
                      type="button"
                      onClick={() => setActiveDashboardTab('stats')}
                      style={dashboardTabStyle(activeDashboardTab === 'stats')}
                    >
                      <User size={12} style={{ marginRight: '0.2rem', display: 'inline', verticalAlign: 'middle' }} />
                      Statistiken
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDashboardTab('history')}
                      style={dashboardTabStyle(activeDashboardTab === 'history')}
                    >
                      <History size={12} style={{ marginRight: '0.2rem', display: 'inline', verticalAlign: 'middle' }} />
                      Letzte Spiele
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDashboardTab('leaderboard')}
                      style={dashboardTabStyle(activeDashboardTab === 'leaderboard')}
                    >
                      <Trophy size={12} style={{ marginRight: '0.2rem', display: 'inline', verticalAlign: 'middle' }} />
                      Bestenliste
                    </button>
                  </div>

                  {/* Render Dashboard Subviews */}
                  <div style={{ flex: 1 }}>
                    {activeDashboardTab === 'stats' && renderStatsDashboard()}
                    {activeDashboardTab === 'history' && renderHistoryDashboard()}
                    {activeDashboardTab === 'leaderboard' && renderLeaderboardDashboard()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
