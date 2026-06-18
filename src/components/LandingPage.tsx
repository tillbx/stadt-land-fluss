import React, { useState, useEffect } from 'react';
import { LogIn, Sparkles, History, Trophy, User, LogOut, Camera, Mail, Lock } from 'lucide-react';
import { audioHelper } from '../utils/AudioHelper';
import { pb } from '../pocketbase';
import { AVATAR_PRESETS } from '../utils/AvatarPresets';
import { PlayerAvatar } from './PlayerAvatar';
import { AvatarPicker } from './AvatarPicker';
import { containsBadWords } from '../utils/WordCensor';

const THEMES = [
  { id: 'default', name: 'Sleek Dark', color: 'linear-gradient(135deg, #6366f1, #ec4899)' },
  { id: 'cyberpunk', name: 'Cyberpunk', color: 'linear-gradient(135deg, #00ff66, #ff007f)' },
  { id: 'slate', name: 'Slate', color: 'linear-gradient(135deg, #94a3b8, #475569)' },
  { id: 'emerald', name: 'Emerald', color: 'linear-gradient(135deg, #10b981, #047857)' },
  { id: 'sunset', name: 'Sunset', color: 'linear-gradient(135deg, #f97316, #ec4899)' },
  { id: 'ocean', name: 'Ocean Wave', color: 'linear-gradient(135deg, #0ea5e9, #14b8a6)' },
  { id: 'vaporwave', name: 'Vaporwave', color: 'linear-gradient(135deg, #d946ef, #06b6d4)' },
  { id: 'gold', name: 'Carbon Gold', color: 'linear-gradient(135deg, #fbbf24, #f97316)' },
  { id: 'aurora', name: 'Aurora', color: 'linear-gradient(135deg, #10b981, #8b5cf6)' },
  { id: 'lavender', name: 'Lavender', color: 'linear-gradient(135deg, #a78bfa, #f43f5e)' },
];

interface LandingPageProps {
  onCreateRoom: (name: string, customCategories?: string[], avatar?: string) => void;
  onJoinRoom: (roomId: string, name: string, avatar?: string) => void;
  isConnecting: boolean;
  error: string | null;
  user: any;
  onRegister: (email: string, password: string, displayName?: string, avatarFile?: File | null, presetAvatar?: string) => Promise<void>;
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => void;
  onUpdateProfile: (displayName: string, avatarFile: File | null, presetAvatar?: string) => Promise<any>;
  activeTheme: string;
  onUpdateTheme: (themeName: string) => void;
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
  onUpdateProfile,
  activeTheme,
  onUpdateTheme
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

  // Preset states for LandingPage
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [authPreset, setAuthPreset] = useState<string | null>(null);
  const [updatePreset, setUpdatePreset] = useState<string | null>(null);

  // Dashboard state
  const [activeDashboardTab, setActiveDashboardTab] = useState<'stats' | 'history' | 'leaderboard'>('stats');
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [leaderboardList, setLeaderboardList] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [selectedRound, setSelectedRound] = useState<number>(1);

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
      const userPreset = user.preset_avatar && user.preset_avatar.startsWith('preset_') ? user.preset_avatar : null;
      setUpdatePreset(userPreset);
      if (userPreset) {
        setSelectedPreset(userPreset);
      }
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

  // Assign a saved preset or random preset avatar on mount if none is selected
  useEffect(() => {
    if (!selectedPreset) {
      const savedPreset = localStorage.getItem('slf_player_avatar');
      if (savedPreset && AVATAR_PRESETS.some(p => p.id === savedPreset)) {
        setSelectedPreset(savedPreset);
      } else {
        const randomPreset = AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)];
        setSelectedPreset(randomPreset.id);
        localStorage.setItem('slf_player_avatar', randomPreset.id);
      }
    }
  }, [selectedPreset]);

  const handlePresetSelect = (id: string) => {
    setSelectedPreset(id);
    localStorage.setItem('slf_player_avatar', id);
  };

  // For registration mode random assignment
  useEffect(() => {
    if (isRegisterMode && !authPreset && !authAvatar) {
      if (selectedPreset) {
        setAuthPreset(selectedPreset);
      } else {
        const randomPreset = AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)];
        setAuthPreset(randomPreset.id);
      }
    }
  }, [isRegisterMode, authPreset, authAvatar, selectedPreset]);

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
        setSelectedMatch(null);
        setSelectedRound(1);
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
    const effectiveAvatar = user 
      ? (user.preset_avatar || user.avatar || undefined) 
      : (selectedPreset || undefined);
    onCreateRoom(name.trim(), undefined, effectiveAvatar);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roomCode.trim()) return;
    audioHelper.playClick();
    const effectiveAvatar = user 
      ? (user.preset_avatar || user.avatar || undefined) 
      : (selectedPreset || undefined);
    onJoinRoom(roomCode.trim().toUpperCase(), name.trim(), effectiveAvatar);
  };

  const getPocketBaseErrorMessage = (err: any): string => {
    if (err && err.data && err.data.data) {
      const data = err.data.data;
      const errors: string[] = [];
      Object.entries(data).forEach(([key, val]: any) => {
        let fieldName = key;
        if (key === 'password') fieldName = 'Passwort';
        if (key === 'email') fieldName = 'E-Mail';
        if (key === 'name') fieldName = 'Spielername';
        errors.push(`${fieldName}: ${val.message || JSON.stringify(val)}`);
      });
      if (errors.length > 0) {
        return `Registrierungsfehler - ${errors.join(', ')}`;
      }
    }
    if (err && err.message) {
      if (err.message.includes('validation_len_out_of_range')) {
        return 'Das Passwort muss mindestens 8 Zeichen lang sein.';
      }
      return err.message;
    }
    return 'Authentifizierung fehlgeschlagen.';
  };

  const handleOneTapGuestLogin = async () => {
    audioHelper.playClick();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const savedEmail = localStorage.getItem('slf_guest_email');
      const savedPassword = localStorage.getItem('slf_guest_password');
      
      if (savedEmail && savedPassword) {
        try {
          await onLogin(savedEmail, savedPassword);
          setAuthTab('guest'); // Reset logged out tabs
          return;
        } catch (err) {
          console.warn('Saved guest login failed, creating new one:', err);
          localStorage.removeItem('slf_guest_email');
          localStorage.removeItem('slf_guest_password');
        }
      }

      // Generate new anonymous guest account
      const rand = Math.floor(100000 + Math.random() * 900000);
      const email = `guest_${rand}@stadtlandfluss.local`;
      const password = `pass_${rand}_guest`;
      const displayName = `Gast ${rand}`;
      const presetAvatar = `preset_${Math.floor(Math.random() * 150) + 1}`; // choose a random avatar preset

      // Register and login
      await onRegister(email, password, displayName, null, presetAvatar);
      
      localStorage.setItem('slf_guest_email', email);
      localStorage.setItem('slf_guest_password', password);
      localStorage.setItem('slf_player_avatar', presetAvatar);
      setAuthTab('guest'); // Reset logged out tabs
    } catch (err: any) {
      setAuthError(getPocketBaseErrorMessage(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      if (isRegisterMode) {
        const trimmedName = authName.trim();
        if (!trimmedName) {
          setAuthError('Bitte gib einen Spielernamen ein.');
          setAuthLoading(false);
          return;
        }

        // Validate character set (only numbers and German letters, no spaces/special chars)
        const isValidChars = /^[a-zA-Z0-9äöüÄÖÜß]+$/.test(trimmedName);
        if (!isValidChars) {
          setAuthError('Der Name darf nur Zahlen und deutsche Buchstaben enthalten (keine Leerzeichen oder Sonderzeichen).');
          setAuthLoading(false);
          return;
        }

        // Validate profanity
        if (containsBadWords(trimmedName)) {
          setAuthError('Dieser Name enthält nicht erlaubte Wörter.');
          setAuthLoading(false);
          return;
        }

        await onRegister(authEmail.trim(), authPassword, trimmedName, authAvatar, authPreset || undefined);
      } else {
        await onLogin(authEmail.trim(), authPassword);
      }
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
      setAuthAvatar(null);
      setAuthPreset(null);
      setAuthTab('guest'); // Reset logged out tabs
    } catch (err: any) {
      setAuthError(getPocketBaseErrorMessage(err));
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
      const trimmedName = updateName.trim();
      if (!trimmedName) {
        setUpdateError('Bitte gib einen Spielernamen ein.');
        setUpdateLoading(false);
        return;
      }

      // Validate character set (only numbers and German letters, no spaces/special chars)
      const isValidChars = /^[a-zA-Z0-9äöüÄÖÜß]+$/.test(trimmedName);
      if (!isValidChars) {
        setUpdateError('Der Name darf nur Zahlen und deutsche Buchstaben enthalten (keine Leerzeichen oder Sonderzeichen).');
        setUpdateLoading(false);
        return;
      }

      // Validate profanity
      if (containsBadWords(trimmedName)) {
        setUpdateError('Dieser Name enthält nicht erlaubte Wörter.');
        setUpdateLoading(false);
        return;
      }

      await onUpdateProfile(trimmedName, updateAvatar, updatePreset || undefined);
      setUpdateSuccess(true);
      setUpdateAvatar(null);
    } catch (err: any) {
      setUpdateError(getPocketBaseErrorMessage(err));
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

  const renderPresetPicker = (selectedId: string | null, onSelect: (id: string) => void) => {
    return (
      <div className="preset-picker-container" style={{ margin: '0.5rem 0 1rem 0', width: '100%' }}>
        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.4rem', display: 'block' }}>
          Oder wähle einen Preset-Avatar:
        </label>
        <AvatarPicker selectedId={selectedId} onSelect={onSelect} />
      </div>
    );
  };

  // Renders the registration/login form explicitly
  const renderAuthForms = () => {
    return (
      <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', animation: 'fadeIn 0.3s ease-out' }}>
        <h3 style={{ textShadow: '0 0 10px var(--primary-glow)', color: 'var(--primary)', fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.2rem', textAlign: 'center' }}>
          {isRegisterMode ? 'Konto erstellen' : 'Im Account anmelden'}
        </h3>

        {/* One-Tap Gast-Login Button */}
        <button
          type="button"
          onClick={handleOneTapGuestLogin}
          disabled={authLoading}
          className="btn btn-secondary"
          style={{
            width: '100%',
            borderColor: 'var(--accent)',
            background: 'var(--accent-glow)',
            boxShadow: '0 4px 15px rgba(0, 168, 204, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer'
          }}
        >
          <Sparkles size={16} />
          {authLoading ? 'Lade Gast-Account...' : 'Blitz-Gast-Login (One-Tap)'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.2rem 0' }}>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-glass)' }} />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>oder klassisch</span>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-glass)' }} />
        </div>
        
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
                cursor: 'pointer',
                position: 'relative'
              }}>
                {authPreset && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: AVATAR_PRESETS.find(p => p.id === authPreset)?.gradient,
                    borderRadius: '50%',
                    zIndex: -1
                  }} />
                )}
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : authPreset ? (
                  <span style={{ fontSize: '2.2rem', zIndex: 1 }}>{AVATAR_PRESETS.find(p => p.id === authPreset)?.emoji}</span>
                ) : (
                  <Camera size={26} color="var(--primary)" style={{ zIndex: 1 }} />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setAuthAvatar(e.target.files[0]);
                    setAuthPreset(null);
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

            {/* Preset Avatar Selection Scroll */}
            {renderPresetPicker(authPreset, (id) => {
              setAuthPreset(id);
              setAuthAvatar(null);
              setAvatarPreview(null);
            })}

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

  const renderMatchDetails = (match: any) => {
    const categories = match.categories || [];
    const maxRounds = match.rounds || 1;
    
    // Sort players by points in this match
    const sortedMatchPlayers = [...match.players].sort((a: any, b: any) => (b.points || 0) - (a.points || 0));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', animation: 'fadeIn 0.3s ease-out' }}>
        {/* Back Button */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            audioHelper.playClick();
            setSelectedMatch(null);
            setSelectedRound(1);
          }}
          style={{
            alignSelf: 'flex-start',
            padding: '0.4rem 0.8rem',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            height: 'auto'
          }}
        >
          ← Zurück
        </button>

        {/* Match Header */}
        <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.6rem' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--accent)', fontWeight: 800 }}>
            Raum #{match.code} - Details
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Gespielt am {formatDate(match.ended_at)} | {maxRounds} Runden
          </span>
        </div>

        {/* Final Standings Summary */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-glass)',
          borderRadius: 'var(--radius-md)',
          padding: '0.8rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 700, borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.3rem' }}>
            🏆 Endplatzierung
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {sortedMatchPlayers.map((p: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.1rem 0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>{p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `${p.rank}.`}</span>
                  <PlayerAvatar name={p.name} avatar={p.avatar} style={{ width: '20px', height: '20px', borderRadius: '50%', fontSize: '0.6rem' }} />
                  <span>{p.name} {user && p.user_id === user.id ? ' (Ich)' : ''}</span>
                </span>
                <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{p.points} Pkt.</span>
              </div>
            ))}
          </div>
        </div>

        {/* Round Selector Tab Pills */}
        <div>
          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>
            Runde auswählen:
          </label>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {Array.from({ length: maxRounds }).map((_, i) => {
              const rNum = i + 1;
              const isActive = selectedRound === rNum;
              
              // Get the letter for this round from the first player who has it
              const firstPlayerWithRound = match.players.find((p: any) => p.rounds && p.rounds[rNum]);
              const roundLetter = firstPlayerWithRound?.rounds?.[rNum]?.letter || '';

              return (
                <button
                  key={rNum}
                  type="button"
                  onClick={() => {
                    audioHelper.playClick();
                    setSelectedRound(rNum);
                  }}
                  className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    height: 'auto'
                  }}
                >
                  Runde {rNum} {roundLetter ? `("${roundLetter.toUpperCase()}")` : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Round Details Category List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '35vh', overflowY: 'auto', paddingRight: '0.2rem' }}>
          {categories.map((cat: string) => {
            return (
              <div
                key={cat}
                style={{
                  background: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.8rem'
                }}
              >
                {/* Category Header */}
                <div style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  paddingBottom: '0.3rem',
                  marginBottom: '0.5rem'
                }}>
                  {cat}
                </div>

                {/* Answers list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {match.players.map((p: any) => {
                    const roundData = p.rounds?.[selectedRound];
                    const ansText = roundData?.answers?.[cat] || '';
                    const score = roundData?.points?.[cat] || 0;
                    const hearts = roundData?.hearts?.[cat] || [];
                    const usedJoker = roundData?.answers?._jokers?.split(',').map((s: string) => s.trim().toLowerCase()).includes(cat.toLowerCase());

                    return (
                      <div
                        key={p.name}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.8rem',
                          background: 'rgba(0, 0, 0, 0.15)',
                          padding: '0.4rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid rgba(255, 255, 255, 0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <PlayerAvatar name={p.name} avatar={p.avatar} style={{ width: '16px', height: '16px', borderRadius: '50%', fontSize: '0.55rem' }} />
                            <span>{p.name} {user && p.user_id === user.id ? ' (Ich)' : ''}</span>
                          </span>
                          <span style={{
                            color: ansText ? 'var(--text-main)' : 'rgba(255, 255, 255, 0.2)',
                            fontStyle: ansText ? 'normal' : 'italic',
                            fontSize: '0.8rem',
                            marginTop: '0.1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}>
                            {usedJoker ? '🃏 Joker' : (ansText || 'Keine Antwort')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {hearts.length > 0 && (
                            <span style={{ color: 'var(--secondary)', display: 'inline-flex', alignItems: 'center', fontSize: '0.7rem', gap: '0.1rem' }}>
                              ❤️ {hearts.length}
                            </span>
                          )}
                          <span style={{
                            fontWeight: 'bold',
                            color: score === 20 ? 'var(--accent)' : score >= 10 ? 'var(--success)' : score === 5 ? 'var(--warning)' : 'var(--text-muted)'
                          }}>
                            +{score}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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

    if (selectedMatch) {
      return renderMatchDetails(selectedMatch);
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', overflowY: 'auto', maxHeight: '42vh', paddingRight: '0.2rem', animation: 'fadeIn 0.3s ease-out' }}>
        {historyList.map((match) => {
          const meInMatch = match.players.find((p: any) => p.user_id === user.id);
          const isWinner = meInMatch?.rank === 1;
          
          return (
            <div
              key={match.id}
              onClick={() => {
                audioHelper.playClick();
                setSelectedMatch(match);
                setSelectedRound(1);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${isWinner ? 'var(--success)' : 'var(--border-glass)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '0.8rem',
                position: 'relative',
                boxShadow: isWinner ? '0 0 10px var(--success-glow)' : 'none',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.borderColor = isWinner ? 'var(--success)' : 'rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                e.currentTarget.style.borderColor = isWinner ? 'var(--success)' : 'var(--border-glass)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--accent)' }}>Raum #{match.code}</span>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.15rem 0.4rem',
                  borderRadius: '1rem',
                  fontWeight: 700,
                  background: isWinner ? 'var(--success-glow)' : 'rgba(255, 255, 255, 0.05)',
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
                      <td style={{ padding: '0.15rem 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span>{p.rank}.</span>
                        <PlayerAvatar name={p.name} avatar={p.avatar} style={{ width: '16px', height: '16px', borderRadius: '50%', fontSize: '0.55rem' }} />
                        <span>{p.name}</span>
                      </td>
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
                    <PlayerAvatar 
                      name={u.name || u.username || '?'} 
                      avatar={u.preset_avatar || u.avatar} 
                      userId={u.id} 
                      style={{ width: '22px', height: '22px', borderRadius: '50%', fontSize: '0.65rem' }} 
                    />
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
            boxShadow: '0 0 0 3px var(--primary), 0 0 20px var(--primary-glow)',
            background: updatePreset ? AVATAR_PRESETS.find(p => p.id === updatePreset)?.gradient : 'var(--bg-dark)',
            position: 'relative'
          }}>
            {updateAvatarPreview ? (
              <img src={updateAvatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : updatePreset ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.8rem' }}>
                {AVATAR_PRESETS.find(p => p.id === updatePreset)?.emoji}
              </div>
            ) : user.preset_avatar && user.preset_avatar.startsWith('preset_') ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.8rem', background: AVATAR_PRESETS.find(p => p.id === user.preset_avatar)?.gradient || 'var(--primary)' }}>
                {AVATAR_PRESETS.find(p => p.id === user.preset_avatar)?.emoji}
              </div>
            ) : user.avatar && !user.avatar.startsWith('preset_') ? (
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
                setUpdatePreset(null);
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

          {/* Preset Avatar Selection Scroll */}
          {renderPresetPicker(updatePreset, (id) => {
            setUpdatePreset(id);
            setUpdateAvatar(null);
            setUpdateAvatarPreview(null);
          })}

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
            {(updateName !== (user.name || '') || updateAvatar || updatePreset !== (user.preset_avatar && user.preset_avatar.startsWith('preset_') ? user.preset_avatar : null)) && (
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

        {/* Theme Selector inside Profile Card */}
        <div style={{ 
          width: '100%',
          background: 'rgba(255, 255, 255, 0.01)', 
          border: '1px solid var(--border-glass)', 
          padding: '0.8rem 1rem', 
          borderRadius: 'var(--radius-md)',
          marginTop: '0.2rem',
          marginBottom: '0.2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.03em' }}>
              🎨 FARBTHEMA
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 500 }}>
              {THEMES.find(t => t.id === activeTheme)?.name || 'Sleek Dark'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {THEMES.map((t) => {
              const isActive = activeTheme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    audioHelper.playClick();
                    onUpdateTheme(t.id);
                  }}
                  title={t.name}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: t.color,
                    border: 'none',
                    boxShadow: isActive 
                      ? '0 0 0 2px white, 0 0 8px rgba(255,255,255,0.4)' 
                      : '0 1px 5px rgba(0,0,0,0.25)',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'all 0.2s ease',
                    transform: isActive ? 'scale(1.15)' : 'scale(1)',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.transform = 'scale(1.15)'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.transform = 'scale(1)'; }}
                />
              );
            })}
          </div>
        </div>

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
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '0 0.5rem', position: 'relative' }}>
      

      
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

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              {/* Selected Avatar Preview */}
              <div 
                onClick={() => {
                  audioHelper.playClick();
                  const randomPreset = AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)];
                  handlePresetSelect(randomPreset.id);
                }}
                title="Klicke für einen anderen zufälligen Avatar"
                style={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                }}
                className="avatar-preview-clickable"
              >
                <PlayerAvatar 
                  name={name || 'Gast'} 
                  avatar={user ? (user.preset_avatar || user.avatar || undefined) : (selectedPreset || undefined)} 
                  userId={user?.id}
                  style={{ width: '60px', height: '60px', borderRadius: '50%', fontSize: '1.8rem', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }} 
                />
              </div>

              <div className="form-group" style={{ flex: 1, margin: 0, textAlign: 'left' }}>
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
            </div>

            {renderPresetPicker(selectedPreset, handlePresetSelect)}

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
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                    {/* Selected Avatar Preview */}
                    <div 
                      onClick={() => {
                        audioHelper.playClick();
                        const randomPreset = AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)];
                        handlePresetSelect(randomPreset.id);
                      }}
                      title="Klicke für einen anderen zufälligen Avatar"
                      style={{
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease',
                      }}
                      className="avatar-preview-clickable"
                    >
                      <PlayerAvatar 
                        name={name || 'Gast'} 
                        avatar={user ? (user.preset_avatar || user.avatar || undefined) : (selectedPreset || undefined)} 
                        userId={user?.id}
                        style={{ width: '60px', height: '60px', borderRadius: '50%', fontSize: '1.8rem', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }} 
                      />
                    </div>

                    <div className="form-group" style={{ flex: 1, margin: 0, textAlign: 'left' }}>
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
                  </div>

                  {renderPresetPicker(selectedPreset, handlePresetSelect)}

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

                  {/* Theme Selector */}
                  <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ 
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem 1.2rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>
                          🎨 FARBTHEMA
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 500 }}>
                          {THEMES.find(t => t.id === activeTheme)?.name || 'Sleek Dark'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {THEMES.map((t) => {
                          const isActive = activeTheme === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                audioHelper.playClick();
                                onUpdateTheme(t.id);
                              }}
                              title={t.name}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: t.color,
                                border: 'none',
                                boxShadow: isActive 
                                  ? '0 0 0 2.5px white, 0 0 12px rgba(255,255,255,0.45)' 
                                  : '0 2px 8px rgba(0,0,0,0.3)',
                                cursor: 'pointer',
                                padding: 0,
                                transition: 'all 0.2s ease',
                                transform: isActive ? 'scale(1.15)' : 'scale(1)',
                              }}
                              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.transform = 'scale(1.15)'; }}
                              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.transform = 'scale(1)'; }}
                            />
                          );
                        })}
                      </div>
                    </div>
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
