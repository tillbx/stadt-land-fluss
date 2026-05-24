import { useState, useEffect, useRef } from 'react';
import { Timer, Send, Users, ShieldAlert } from 'lucide-react';
import type { RoomRecord, PlayerRecord, AnswerRecord } from '../hooks/useGameRoom';
import { audioHelper } from '../utils/AudioHelper';
import { getPlayerAvatarUrl } from '../pocketbase';

interface GameActiveProps {
  room: RoomRecord;
  players: PlayerRecord[];
  me: PlayerRecord;
  answers: AnswerRecord[];
  onSubmitAnswers: (roundNum: number, answersJson: Record<string, string>) => Promise<void>;
  onTriggerStop: () => Promise<void>;
  onForceEvaluate: () => Promise<void>;
}

export function GameActive({
  room,
  players,
  me,
  answers,
  onSubmitAnswers,
  onTriggerStop,
  onForceEvaluate,
}: GameActiveProps) {
  const [answersState, setAnswersState] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    room.settings.categories.forEach((cat) => {
      initial[cat] = '';
    });
    return initial;
  });

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isGracePeriod, setIsGracePeriod] = useState(false);
  
  const answersStateRef = useRef(answersState);
  const hasSubmittedRef = useRef(hasSubmitted);

  // Sync refs
  useEffect(() => { answersStateRef.current = answersState; }, [answersState]);
  useEffect(() => { hasSubmittedRef.current = hasSubmitted; }, [hasSubmitted]);

  // Handle Input typing and auto capitalization
  const handleInputChange = (cat: string, value: string) => {
    if (hasSubmitted) return;
    
    // Auto-capitalize first letter of each word/field
    let formatted = value;
    if (value.length > 0) {
      formatted = value.charAt(0).toUpperCase() + value.slice(1);
    }
    
    setAnswersState((prev) => ({
      ...prev,
      [cat]: formatted,
    }));
  };

  // Timer loop
  useEffect(() => {
    if (!room.timer_ends_at) {
      setTimeLeft(null);
      return;
    }

    const timerEnds = new Date(room.timer_ends_at).getTime();
    
    // Determine if we are in the 10s grace countdown
    if (room.stop_triggered_by) {
      setIsGracePeriod(true);
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((timerEnds - now) / 1000));
      setTimeLeft(diff);

      // Play warning ticks in last 5 seconds
      if (diff <= 5 && diff > 0) {
        audioHelper.playTick();
      }

      if (diff === 0) {
        clearInterval(intervalId);
        
        // Auto-submit when timer expires
        if (!hasSubmittedRef.current) {
          handleAutoSubmit();
        }

        // Host triggers transition to evaluation
        if (me.is_host) {
          setTimeout(() => {
            audioHelper.playBuzzer();
            onForceEvaluate();
          }, 1000);
        }
      }
    };

    updateTimer(); // run initial
    const intervalId = setInterval(updateTimer, 250);

    return () => clearInterval(intervalId);
  }, [room.timer_ends_at, room.stop_triggered_by]);

  const handleAutoSubmit = async () => {
    setHasSubmitted(true);
    await onSubmitAnswers(room.current_round, answersStateRef.current);
  };

  const handleStopClick = async () => {
    if (hasSubmitted) return;
    audioHelper.playClick();
    
    setHasSubmitted(true);
    // 1. Submit answers to DB
    await onSubmitAnswers(room.current_round, answersState);
    // 2. Trigger stop/countdown in room
    await onTriggerStop();
  };

  // Check which players have submitted
  const submittedPlayerIds = answers
    .filter((a) => a.round_num === room.current_round && a.is_submitted)
    .map((a) => a.player_id);

  // Timer bar percentage
  let timerPercent = 100;
  if (timeLeft !== null && room.timer_duration > 0) {
    const totalDuration = isGracePeriod ? 10 : room.timer_duration;
    timerPercent = (timeLeft / totalDuration) * 100;
  }

  return (
    <div className="fade-in" style={{ width: '100%', maxWidth: '800px' }}>
      
      {/* Game Header: Letter & Active Clock */}
      <div className="game-header">
        <div className="letter-badge-large">
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Buchstabe</span>
          <div className="letter-circle">{room.current_letter}</div>
        </div>

        <div className="timer-wrapper">
          <Timer size={22} color={timeLeft !== null && timeLeft <= 5 ? 'var(--danger)' : 'var(--accent)'} />
          {timeLeft !== null ? (
            <span style={{ color: timeLeft <= 5 ? 'var(--danger)' : 'var(--text-main)' }}>
              {timeLeft}s
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Freies Spiel</span>
          )}
        </div>
      </div>

      {/* Synchronized Timer Progress Bar */}
      {timeLeft !== null && (
        <div className="timer-bar-container">
          <div
            className={`timer-bar ${timeLeft <= 5 ? 'warning' : ''}`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      )}

      {/* Grace period warning message */}
      {isGracePeriod && room.stop_triggered_by && (
        <div
          className="fade-in"
          style={{
            background: 'var(--danger-glow)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-md)',
            padding: '0.8rem 1.2rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            color: 'var(--danger)',
            fontWeight: 600,
          }}
        >
          <ShieldAlert size={20} />
          <span>{room.stop_triggered_by} ist fertig! Die restlichen Spieler haben noch 10 Sekunden!</span>
        </div>
      )}

      {/* Horizontal Player Progress status right at the top */}
      <div
        className="glass-card"
        style={{
          padding: '0.8rem 1.2rem',
          margin: '0 0 1.5rem 0',
          width: '100%',
          maxWidth: '800px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}
      >
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Users size={14} /> Mitspieler-Status
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {players.map((p) => {
            const done = submittedPlayerIds.includes(p.id);
            return (
              <span
                key={p.id}
                style={{
                  background: done ? 'var(--success-glow)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${done ? 'var(--success)' : 'var(--border-glass)'}`,
                  borderRadius: '20px',
                  padding: '0.3rem 0.8rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: done ? 'var(--success)' : 'var(--text-muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                {p.avatar ? (
                  <img
                    src={getPlayerAvatarUrl(p.user_id!, p.avatar)}
                    alt={p.name}
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                      color: 'white',
                      fontSize: '0.6rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold'
                    }}
                  >
                    {p.name[0].toUpperCase()}
                  </div>
                )}
                {p.name} {done ? '✓' : '...'}
              </span>
            );
          })}
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '800px' }}>
        {/* Main Inputs Grid */}
        <div className="game-grid" style={{ maxWidth: '100%' }}>
          {room.settings.categories.map((cat) => (
            <div key={cat} className="category-row">
              <label className="category-title" htmlFor={`input-${cat}`}>{cat}</label>
              <input
                id={`input-${cat}`}
                type="text"
                className="category-input"
                placeholder={`${room.current_letter}...`}
                value={answersState[cat]}
                onChange={(e) => handleInputChange(cat, e.target.value)}
                disabled={hasSubmitted}
                autoComplete="off"
                maxLength={40}
              />
            </div>
          ))}

          {/* Action button */}
          <button
            className="btn btn-primary"
            onClick={handleStopClick}
            disabled={hasSubmitted}
            style={{
              padding: '1.2rem',
              fontSize: '1.3rem',
              marginTop: '1rem',
              boxShadow: hasSubmitted ? 'none' : '0 6px 25px var(--primary-glow)',
              background: hasSubmitted ? 'var(--bg-card)' : 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            }}
          >
            <Send size={20} />
            {hasSubmitted ? 'Antworten abgegeben!' : 'Ich bin fertig! / STOPP'}
          </button>
        </div>
      </div>
    </div>
  );
}
