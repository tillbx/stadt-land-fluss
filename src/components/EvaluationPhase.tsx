import { useState, useRef } from 'react';
import { Check, X, Heart, ShieldCheck } from 'lucide-react';
import type { RoomRecord, PlayerRecord, AnswerRecord } from '../hooks/useGameRoom';
import { audioHelper } from '../utils/AudioHelper';
import { PlayerAvatar } from './PlayerAvatar';
import { GameChat } from './GameChat';

interface EvaluationPhaseProps {
  room: RoomRecord;
  players: PlayerRecord[];
  me: PlayerRecord;
  answers: AnswerRecord[];
  onCastVote: (answerId: string, category: string, voterId: string, isValid: boolean) => Promise<void>;
  onCastHeart: (answerId: string, category: string, voterId: string) => Promise<void>;
  onEvaluateRoundAndFinish: () => Promise<void>;
  messages: any[];
  onSendChatMessage: (text: string) => Promise<void>;
  onSendEmote: (emoji: string) => Promise<void>;
  onSetTypingStatus: (isTyping: boolean) => void | Promise<void>;
}

interface EvaluationRowProps {
  player: PlayerRecord;
  cat: string;
  playerAnswerSheet: AnswerRecord | undefined;
  hasAnswer: boolean;
  rawAnswer: string;
  yesVotes: number;
  noVotes: number;
  heartCount: number;
  myVote: boolean | undefined;
  myHeart: boolean;
  isMe: boolean;
  isRejected: boolean;
  autoInvalid: boolean;
  onVote: (answerId: string, category: string, isValid: boolean) => Promise<void>;
  onHeart: (answerId: string, category: string) => Promise<void>;
  usedJoker: boolean;
  isFirstCategory: boolean;
}

function EvaluationRow({
  player,
  cat,
  playerAnswerSheet,
  hasAnswer,
  rawAnswer,
  yesVotes,
  noVotes,
  heartCount,
  myVote,
  myHeart,
  isMe,
  isRejected,
  autoInvalid,
  onVote,
  onHeart,
  usedJoker,
  isFirstCategory,
}: EvaluationRowProps) {
  const [swipeStatus, setSwipeStatus] = useState<'yes' | 'no' | null>(null);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const lastTap = useRef<number>(0);

  const triggerHeartPop = () => {
    setShowHeartPop(true);
    setTimeout(() => {
      setShowHeartPop(false);
    }, 800);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isMe || !hasAnswer || autoInvalid || usedJoker) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.touches[0].clientX - touchStartX.current;
    const diffY = e.touches[0].clientY - touchStartY.current;

    // Show temporary overlay on swipe drag if mostly horizontal
    if (Math.abs(diffY) < 30) {
      if (diffX > 25) {
        setSwipeStatus('yes');
      } else if (diffX < -25) {
        setSwipeStatus('no');
      } else {
        setSwipeStatus(null);
      }
    } else {
      setSwipeStatus(null);
    }
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(diffX) > 60 && Math.abs(diffY) < 40 && playerAnswerSheet) {
      if (diffX > 0) {
        // Swipe Right -> Upvote (Gültig)
        await onVote(playerAnswerSheet.id, cat, true);
      } else {
        // Swipe Left -> Downvote (Ungültig)
        await onVote(playerAnswerSheet.id, cat, false);
      }
    }

    setSwipeStatus(null);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleDoubleTap = async () => {
    if (isMe || !hasAnswer || !playerAnswerSheet || usedJoker) return;
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
      triggerHeartPop();
      await onHeart(playerAnswerSheet.id, cat);
    }
    lastTap.current = now;
  };

  // Determine outline/border color based on my vote/heart
  let highlightClass = '';
  if (hasAnswer && !autoInvalid) {
    if (myHeart) {
      highlightClass = 'my-vote-heart';
    } else if (myVote === true) {
      highlightClass = 'my-vote-yes';
    } else if (myVote === false) {
      highlightClass = 'my-vote-no';
    }
  }

  return (
    <div
      className={`eval-answer-row ${isRejected || autoInvalid ? 'rejected' : ''} ${highlightClass}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleDoubleTap}
    >
      {/* Swipe Feedback Overlay */}
      {swipeStatus === 'yes' && <div className="eval-swipe-overlay yes">Gültig (Ja)</div>}
      {swipeStatus === 'no' && <div className="eval-swipe-overlay no">Ungültig (Nein)</div>}
      {showHeartPop && (
        <Heart 
          size={48} 
          fill="var(--secondary)" 
          className="heart-pop-icon"
        />
      )}

      {/* Player Name */}
      <span className="eval-player-name" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
        <div id={isFirstCategory ? `avatar-${player.id}` : undefined} style={{ display: 'inline-flex' }}>
          <PlayerAvatar 
            name={player.name} 
            avatar={player.avatar} 
            userId={player.user_id} 
            style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem' }} 
          />
        </div>
        <span>
          {player.name} {isMe ? ' (Ich)' : ''}
        </span>
      </span>

      {/* Answer Text */}
      {hasAnswer ? (
        <span className="eval-answer-text">
          {rawAnswer}
          {usedJoker && (
            <span style={{ fontSize: '0.75rem', color: 'var(--accent)', marginLeft: '0.5rem', fontWeight: 'bold' }}>
              🃏 Joker benutzt
            </span>
          )}
          {autoInvalid && !usedJoker && (
            <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginLeft: '0.5rem', fontWeight: 'normal' }}>
              (Falscher Anfangsbuchstabe)
            </span>
          )}
        </span>
      ) : (
        <span className="eval-answer-text empty">Keine Antwort</span>
      )}

      {/* Vote Actions */}
      <div className="eval-actions">
        {usedJoker ? (
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--accent)',
            fontWeight: 'bold',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '0.3rem 0.6rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.2rem'
          }}>
            🃏 Joker (5 Pkt.)
          </div>
        ) : (
          <>
            {/* Yes Vote */}
            <div className="eval-btn-wrapper">
              <button
                className={`eval-btn ${myVote === true ? 'active-yes' : ''}`}
                onClick={(e) => { e.stopPropagation(); playerAnswerSheet && onVote(playerAnswerSheet.id, cat, true); }}
                disabled={isMe || !hasAnswer || autoInvalid}
                title={isMe ? 'Eigene Antwort' : 'Gültig'}
              >
                <Check size={16} />
              </button>
              {yesVotes > 0 && <span className="vote-counter" style={{ borderColor: 'var(--success)' }}>{yesVotes}</span>}
            </div>

            {/* No Vote */}
            <div className="eval-btn-wrapper">
              <button
                className={`eval-btn ${myVote === false || autoInvalid ? 'active-no' : ''}`}
                onClick={(e) => { e.stopPropagation(); playerAnswerSheet && onVote(playerAnswerSheet.id, cat, false); }}
                disabled={isMe || !hasAnswer || autoInvalid}
                title={isMe ? 'Eigene Antwort' : 'Ungültig'}
              >
                <X size={16} />
              </button>
              {noVotes > 0 && <span className="vote-counter" style={{ borderColor: 'var(--danger)' }}>{noVotes}</span>}
            </div>

            {/* Heart */}
            <div className="eval-btn-wrapper">
              <button
                className={`eval-btn ${myHeart ? 'active-heart' : ''}`}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (playerAnswerSheet) {
                    if (!myHeart) {
                      triggerHeartPop();
                    }
                    onHeart(playerAnswerSheet.id, cat); 
                  }
                }}
                disabled={isMe || !hasAnswer}
                title={isMe ? 'Eigene Antwort' : 'Kreativ-Herz'}
              >
                <Heart size={16} fill={myHeart ? 'var(--secondary)' : 'none'} />
              </button>
              {heartCount > 0 && <span className="vote-counter" style={{ borderColor: 'var(--secondary)' }}>{heartCount}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function EvaluationPhase({
  room,
  players,
  me,
  answers,
  onCastVote,
  onCastHeart,
  onEvaluateRoundAndFinish,
  messages,
  onSendChatMessage,
  onSendEmote,
  onSetTypingStatus,
}: EvaluationPhaseProps) {
  
  const handleVote = async (answerId: string, category: string, isValid: boolean) => {
    audioHelper.playClick();
    await onCastVote(answerId, category, me.id, isValid);
  };

  const handleHeart = async (answerId: string, category: string) => {
    audioHelper.playClick();
    await onCastHeart(answerId, category, me.id);
  };

  return (
    <div className="fade-in eval-container">
      <div className="eval-title">
        <h2 style={{ fontSize: '2rem' }}>Auswertungsrunde</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Stimme über die Begriffe deiner Mitspieler ab.
          {room.settings.validateFirstLetter !== false && (
            <>
              {' '}Sie müssen mit{' '}
              <strong style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>
                "{room.current_letter}"
              </strong>{' '}
              beginnen!
            </>
          )}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', marginTop: '0.4rem' }} className="btn-text-desktop">
          Tipp: Du kannst auf Mobilgeräten wischen (Rechts = Gültig, Links = Ungültig) und doppeltippen (Herz)!
        </p>
      </div>

      <div className="eval-categories-grid">
        {room.settings.categories.map((cat, catIdx) => {
          return (
            <div key={cat} className="eval-category-block">
              <div className="eval-category-header">{cat}</div>
              
              <div className="eval-answers-grid">
                {players.map((p) => {
                  const playerAnswerSheet = answers.find(
                    (a) => a.player_id === p.id && a.round_num === room.current_round
                  );
                  
                  const rawAnswer = (playerAnswerSheet?.answers?.[cat] || '').trim();
                  const hasAnswer = rawAnswer.length > 0;
                  
                  const jokersStr = playerAnswerSheet?.answers?._jokers || '';
                  const usedJoker = jokersStr.split(',').map((s: string) => s.trim().toLowerCase()).includes(cat.toLowerCase());

                  const catVotes = playerAnswerSheet?.votes?.[cat] || {};
                  const yesVotes = Object.values(catVotes).filter((v) => v === true).length;
                  const noVotes = Object.values(catVotes).filter((v) => v === false).length;
                  
                  const heartsList = playerAnswerSheet?.hearts?.[cat] || [];
                  const heartCount = heartsList.length;

                  const myVote = catVotes[me.id];
                  const myHeart = heartsList.includes(me.id);

                  const isMe = p.id === me.id;
                  const isRejected = !usedJoker && noVotes > yesVotes;

                  const enforceFirstLetter = room.settings.validateFirstLetter !== false;
                  const startsWithCorrectLetter = hasAnswer && rawAnswer[0].toLowerCase() === room.current_letter.toLowerCase();
                  const autoInvalid = !usedJoker && enforceFirstLetter && hasAnswer && !startsWithCorrectLetter;

                  return (
                    <EvaluationRow
                      key={p.id}
                      player={p}
                      cat={cat}
                      playerAnswerSheet={playerAnswerSheet}
                      hasAnswer={hasAnswer}
                      rawAnswer={rawAnswer}
                      yesVotes={yesVotes}
                      noVotes={noVotes}
                      heartCount={heartCount}
                      myVote={myVote}
                      myHeart={myHeart}
                      isMe={isMe}
                      isRejected={isRejected}
                      autoInvalid={autoInvalid}
                      onVote={handleVote}
                      onHeart={handleHeart}
                      usedJoker={usedJoker}
                      isFirstCategory={catIdx === 0}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Finishing / Submitting Evaluation */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '1.5rem' }}>
        {me.is_host ? (
          <button
            className="btn btn-primary"
            onClick={async () => {
              audioHelper.playSuccess();
              await onEvaluateRoundAndFinish();
            }}
            style={{
              padding: '1rem 2.5rem',
              fontSize: '1.2rem',
              background: 'linear-gradient(135deg, var(--success) 0%, hsl(145, 90%, 55%) 100%)',
              boxShadow: '0 4px 15px var(--success-glow)',
            }}
          >
            <ShieldCheck size={20} />
            Auswertung beenden
          </button>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="spinning-sub">Warte darauf, dass der Host die Auswertung abschließt...</span>
          </div>
        )}
      </div>
      <GameChat
        messages={messages}
        onSendMessage={onSendChatMessage}
        onSendEmote={onSendEmote}
        players={players}
        me={me}
        roomStatus={room.status}
        onSetTypingStatus={onSetTypingStatus}
      />
    </div>
  );
}
