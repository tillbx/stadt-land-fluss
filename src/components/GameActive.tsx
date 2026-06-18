import { useState, useEffect, useRef } from 'react';
import { Timer, Send, ShieldAlert, ArrowLeft, ArrowRight } from 'lucide-react';
import type { RoomRecord, PlayerRecord, AnswerRecord } from '../hooks/useGameRoom';
import { audioHelper } from '../utils/AudioHelper';
import { PlayerAvatar } from './PlayerAvatar';
import { getRandomWord } from '../utils/WordDictionary';

interface GameActiveProps {
  room: RoomRecord;
  players: PlayerRecord[];
  me: PlayerRecord;
  answers: AnswerRecord[];
  onSubmitAnswers: (roundNum: number, answersJson: Record<string, string>) => Promise<void>;
  onTriggerStop: () => Promise<void>;
  onForceEvaluate: () => Promise<void>;
  jokersUsedCount: number;
  onUseJoker: () => void;
}

const vibrate = (pattern: number | number[]) => {
  if (typeof window !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn('Vibration failed:', e);
    }
  }
};

export function GameActive({
  room,
  players,
  me,
  answers,
  onSubmitAnswers,
  onTriggerStop,
  onForceEvaluate,
  jokersUsedCount,
  onUseJoker,
}: GameActiveProps) {
  const categories = room.settings.categories;

  const [answersState, setAnswersState] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    categories.forEach((cat) => {
      initial[cat] = '';
    });
    return initial;
  });

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isGracePeriod, setIsGracePeriod] = useState(false);
  const [isSelectingJoker, setIsSelectingJoker] = useState(false);

  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [jokerCategories, setJokerCategories] = useState<string[]>([]);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const answersStateRef = useRef(answersState);
  const hasSubmittedRef = useRef(hasSubmitted);
  const lastStopTriggeredBy = useRef(room.stop_triggered_by);
  const jokerCategoriesRef = useRef(jokerCategories);

  // Sync refs
  useEffect(() => { answersStateRef.current = answersState; }, [answersState]);
  useEffect(() => { hasSubmittedRef.current = hasSubmitted; }, [hasSubmitted]);
  useEffect(() => { jokerCategoriesRef.current = jokerCategories; }, [jokerCategories]);

  // Vibrate when another player triggers STOP (start of the stop countdown)
  useEffect(() => {
    if (room.stop_triggered_by && !lastStopTriggeredBy.current) {
      vibrate([200, 100, 200]);
    }
    lastStopTriggeredBy.current = room.stop_triggered_by;
  }, [room.stop_triggered_by]);

  // Screen size listener to toggle desktop/mobile modes dynamically
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 650);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Wake Lock API to prevent screen sleep during gameplay
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('Screen Wake Lock active');
        } catch (err: any) {
          console.warn(`Screen Wake Lock failed: ${err.name}, ${err.message}`);
        }
      }
    };

    requestWakeLock();

    const handleVisibilityChange = async () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().then(() => {
          wakeLock = null;
          console.log('Screen Wake Lock released');
        }).catch((err: any) => {
          console.warn('Screen Wake Lock release error:', err);
        });
      }
    };
  }, []);

  // Autofocus the first category input field when page loads
  useEffect(() => {
    if (!hasSubmitted) {
      const firstCat = categories[0];
      const firstInput = document.getElementById(`input-${firstCat}`) as HTMLInputElement | null;
      if (firstInput) {
        firstInput.focus();
      }
    }
  }, [hasSubmitted]);

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

    let lastTickSecond = -1;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((timerEnds - now) / 1000));
      setTimeLeft(diff);

      // Play warning ticks and vibrate in last 5 seconds (exactly once per second)
      if (diff <= 5 && diff > 0 && diff !== lastTickSecond) {
        lastTickSecond = diff;
        audioHelper.playTick();
        vibrate(100);
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

  const remainingJokers = (room.settings?.jokersCount || 1) - jokersUsedCount;

  const applyJoker = (cat: string) => {
    if (hasSubmitted || remainingJokers <= 0) return;
    if (jokerCategories.includes(cat)) return; // already has a joker
    
    const word = getRandomWord(cat, room.current_letter);
    if (word) {
      audioHelper.playClick();
      vibrate(100);
      setAnswersState((prev) => ({
        ...prev,
        [cat]: word,
      }));
      setJokerCategories((prev) => [...prev, cat]);
      onUseJoker();
      setIsSelectingJoker(false);
    } else {
      alert(`Kein Wort für "${cat}" mit dem Buchstaben "${room.current_letter}" gefunden.`);
    }
  };

  const handleAutoSubmit = async () => {
    setHasSubmitted(true);
    vibrate(100);
    const finalAnswers = {
      ...answersStateRef.current,
      _jokers: jokerCategoriesRef.current.join(',')
    };
    await onSubmitAnswers(room.current_round, finalAnswers);
  };

  const handleStopClick = async () => {
    if (hasSubmitted) return;
    audioHelper.playClick();
    
    setHasSubmitted(true);
    vibrate(100);
    
    const finalAnswers = {
      ...answersState,
      _jokers: jokerCategories.join(',')
    };
    // 1. Submit answers to DB
    await onSubmitAnswers(room.current_round, finalAnswers);
    // 2. Trigger stop/countdown in room
    await onTriggerStop();
  };

  // Keyboard navigation: Enter transitions to the next category input in the list
  const handleKeyDown = (catIndex: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (catIndex < categories.length - 1) {
        const nextCat = categories[catIndex + 1];
        if (window.innerWidth <= 650) {
          setActiveCategoryIndex(catIndex + 1);
        }
        const nextInput = document.getElementById(`input-${nextCat}`) as HTMLInputElement | null;
        if (nextInput) {
          nextInput.focus();
        }
      } else {
        handleStopClick();
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    if (Math.abs(diffX) > 60 && Math.abs(diffY) < 40) {
      if (diffX > 0) {
        // Swiped left -> next category
        if (activeCategoryIndex < categories.length - 1) {
          const nextIdx = activeCategoryIndex + 1;
          setActiveCategoryIndex(nextIdx);
          setTimeout(() => {
            const nextInput = document.getElementById(`input-${categories[nextIdx]}`) as HTMLInputElement | null;
            if (nextInput) nextInput.focus();
          }, 100);
        }
      } else {
        // Swiped right -> prev category
        if (activeCategoryIndex > 0) {
          const prevIdx = activeCategoryIndex - 1;
          setActiveCategoryIndex(prevIdx);
          setTimeout(() => {
            const prevInput = document.getElementById(`input-${categories[prevIdx]}`) as HTMLInputElement | null;
            if (prevInput) prevInput.focus();
          }, 100);
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
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
    <div className="fade-in" style={{ width: '100%', maxWidth: '1050px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Sticky Play Header containing Room Info, Letter, Clock, and Progress Bar */}
      <div className="sticky-play-header">
        <div className="game-header">
          <div className="letter-badge-large">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Buchstabe</span>
            <div className="letter-circle">{room.current_letter}</div>
          </div>

          <div className="timer-wrapper">
            <Timer size={22} color={timeLeft !== null && timeLeft <= 5 ? 'var(--danger)' : 'var(--accent)'} />
            {timeLeft !== null ? (
              <span style={{ color: timeLeft <= 5 ? 'var(--danger)' : 'var(--text-main)', fontSize: '1.4rem' }}>
                {timeLeft}s
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Freies Spiel</span>
            )}
          </div>

          {room.settings?.jokersEnabled !== false && (
            <button
              type="button"
              className={`btn ${isSelectingJoker ? 'btn-primary' : 'btn-secondary'}`}
              disabled={hasSubmitted || remainingJokers <= 0}
              onClick={() => {
                audioHelper.playClick();
                setIsSelectingJoker(!isSelectingJoker);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.9rem',
                fontSize: '0.9rem',
                boxShadow: isSelectingJoker ? '0 0 15px var(--primary-glow)' : 'none',
                height: '42px',
              }}
            >
              {isSelectingJoker ? (
                <span>Joker wählen...</span>
              ) : (
                <>
                  <span>🃏 Joker</span>
                  {remainingJokers > 1 && (
                    <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>({remainingJokers})</span>
                  )}
                </>
              )}
            </button>
          )}
        </div>

        {/* Sleek horizontal player status row */}
        <div className="sticky-players-bar">
          {players.map((p) => {
            const done = submittedPlayerIds.includes(p.id);
            return (
              <span
                key={p.id}
                className={`sticky-player-badge ${done ? 'done' : ''}`}
              >
                <PlayerAvatar name={p.name} avatar={p.avatar} userId={p.user_id} className="sticky-player-avatar" />
                <span className="sticky-player-name">{p.name}</span>
                <span className={`sticky-player-status-dot ${done ? 'done' : ''}`} />
              </span>
            );
          })}
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
      </div>

      {/* Grace period warning message */}
      {isGracePeriod && room.stop_triggered_by && (
        <div
          className="fade-in"
          style={{
            background: 'var(--danger-glow)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-md)',
            padding: '0.8rem 1.2rem',
            marginBottom: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            color: 'var(--danger)',
            fontWeight: 600,
            width: '100%',
          }}
        >
          <ShieldAlert size={20} />
          <span style={{ fontSize: '0.85rem' }}>{room.stop_triggered_by} ist fertig! Die restlichen Spieler haben noch 10 Sekunden!</span>
        </div>
      )}

      {/* Main Categories Layout (List on Desktop, Slide Track Carousel on Mobile) */}
      <div style={{ width: '100%' }}>
        {!isMobile ? (
          <div className="game-grid" style={{ maxWidth: '100%' }}>
            {categories.map((cat, idx) => (
              <div key={cat} className="category-row">
                <label
                  className={`category-title ${isSelectingJoker && !jokerCategories.includes(cat) ? 'joker-selectable-label' : ''}`}
                  htmlFor={isSelectingJoker ? undefined : `input-${cat}`}
                  onClick={(e) => {
                    if (isSelectingJoker) {
                      e.preventDefault();
                      applyJoker(cat);
                    }
                  }}
                >
                  {cat}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                  <input
                    id={`input-${cat}`}
                    type="text"
                    className={`category-input ${isSelectingJoker && !jokerCategories.includes(cat) ? 'joker-selectable' : ''}`}
                    style={{ flex: 1 }}
                    placeholder={
                      isSelectingJoker && !jokerCategories.includes(cat)
                        ? 'Hier tippen für Joker...'
                        : `${room.current_letter}...`
                    }
                    value={answersState[cat]}
                    onChange={(e) => handleInputChange(cat, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onFocus={(e) => {
                      if (isSelectingJoker) {
                        e.target.blur();
                        applyJoker(cat);
                      }
                    }}
                    onClick={(e) => {
                      if (isSelectingJoker) {
                        e.preventDefault();
                        e.stopPropagation();
                        applyJoker(cat);
                      }
                    }}
                    disabled={hasSubmitted || jokerCategories.includes(cat)}
                    autoComplete="off"
                    maxLength={40}
                    enterKeyHint={idx < categories.length - 1 ? 'next' : 'send'}
                  />
                  {jokerCategories.includes(cat) && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: 'var(--primary-glow)',
                      border: '1px solid var(--primary)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0 0.6rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-main)',
                      fontWeight: 600,
                      gap: '0.2rem',
                      height: '46px',
                      userSelect: 'none'
                    }}>
                      <span>🃏</span>
                      <span>Joker</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Action button */}
            <button
              className="btn btn-primary"
              onClick={handleStopClick}
              disabled={hasSubmitted}
              style={{
                gridColumn: '1 / -1',
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
        ) : (
          <div style={{ width: '100%' }}>
            {/* Horizontal scrollable tab capsules for overview */}
            <div className="category-tabs-container">
              {categories.map((cat, idx) => {
                const hasValue = !!answersState[cat]?.trim();
                const isActive = idx === activeCategoryIndex;
                return (
                  <button
                    key={cat}
                    className={`category-tab-pill ${isActive ? 'active' : ''} ${hasValue ? 'completed' : ''}`}
                    onClick={() => {
                      setActiveCategoryIndex(idx);
                      setTimeout(() => {
                        const nextInput = document.getElementById(`input-${cat}`) as HTMLInputElement | null;
                        if (nextInput) nextInput.focus();
                      }, 100);
                    }}
                    type="button"
                  >
                    <span className="tab-pill-number">{idx + 1}</span>
                    <span className="tab-pill-text">{cat}</span>
                    {hasValue && <span className="tab-pill-check">✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Slide Viewport and Track */}
            <div 
              className="slide-viewport"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div 
                className="slide-track" 
                style={{ transform: `translateX(-${activeCategoryIndex * 100}%)` }}
              >
                {categories.map((cat, idx) => (
                  <div key={cat} className="slide-item">
                    <div className="mobile-category-card">
                      <label
                        className={`mobile-category-label ${isSelectingJoker && !jokerCategories.includes(cat) ? 'joker-selectable-label' : ''}`}
                        htmlFor={isSelectingJoker ? undefined : `input-${cat}`}
                        onClick={(e) => {
                          if (isSelectingJoker) {
                            e.preventDefault();
                            applyJoker(cat);
                          }
                        }}
                      >
                        {cat}
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                        <input
                          id={`input-${cat}`}
                          type="text"
                          className={`mobile-category-input ${isSelectingJoker && !jokerCategories.includes(cat) ? 'joker-selectable' : ''}`}
                          style={{ flex: 1 }}
                          placeholder={
                            isSelectingJoker && !jokerCategories.includes(cat)
                              ? 'Hier tippen für Joker...'
                              : `${room.current_letter}...`
                          }
                          value={answersState[cat]}
                          onChange={(e) => handleInputChange(cat, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          onFocus={(e) => {
                            if (isSelectingJoker) {
                              e.target.blur();
                              applyJoker(cat);
                            }
                          }}
                          onClick={(e) => {
                            if (isSelectingJoker) {
                              e.preventDefault();
                              e.stopPropagation();
                              applyJoker(cat);
                            }
                          }}
                          disabled={hasSubmitted || jokerCategories.includes(cat)}
                          autoComplete="off"
                          maxLength={40}
                          enterKeyHint={idx < categories.length - 1 ? 'next' : 'send'}
                        />
                        {jokerCategories.includes(cat) && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'var(--primary-glow)',
                            border: '1px solid var(--primary)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0 0.5rem',
                            fontSize: '0.75rem',
                            color: 'var(--text-main)',
                            fontWeight: 600,
                            gap: '0.15rem',
                            height: '42px',
                            userSelect: 'none'
                          }}>
                            <span>🃏</span>
                            <span>Joker</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="mobile-slide-nav">
              <button
                className="btn btn-secondary btn-nav"
                disabled={activeCategoryIndex === 0}
                onClick={() => {
                  const prevIdx = activeCategoryIndex - 1;
                  setActiveCategoryIndex(prevIdx);
                  setTimeout(() => {
                    const prevInput = document.getElementById(`input-${categories[prevIdx]}`) as HTMLInputElement | null;
                    if (prevInput) prevInput.focus();
                  }, 100);
                }}
                type="button"
              >
                <ArrowLeft size={16} /> Zurück
              </button>
              
              {activeCategoryIndex < categories.length - 1 ? (
                <button
                  className="btn btn-primary btn-nav"
                  onClick={() => {
                    const nextIdx = activeCategoryIndex + 1;
                    setActiveCategoryIndex(nextIdx);
                    setTimeout(() => {
                      const nextInput = document.getElementById(`input-${categories[nextIdx]}`) as HTMLInputElement | null;
                      if (nextInput) nextInput.focus();
                    }, 100);
                  }}
                  type="button"
                >
                  Weiter <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-nav submit-nav"
                  onClick={handleStopClick}
                  disabled={hasSubmitted}
                  type="button"
                >
                  <Send size={16} /> STOPP
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
