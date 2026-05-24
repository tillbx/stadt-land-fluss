import { Check, X, Heart, ShieldCheck } from 'lucide-react';
import type { RoomRecord, PlayerRecord, AnswerRecord } from '../hooks/useGameRoom';
import { audioHelper } from '../utils/AudioHelper';
import { getPlayerAvatarUrl } from '../pocketbase';

interface EvaluationPhaseProps {
  room: RoomRecord;
  players: PlayerRecord[];
  me: PlayerRecord;
  answers: AnswerRecord[];
  onCastVote: (answerId: string, category: string, voterId: string, isValid: boolean) => Promise<void>;
  onCastHeart: (answerId: string, category: string, voterId: string) => Promise<void>;
  onEvaluateRoundAndFinish: () => Promise<void>;
}

export function EvaluationPhase({
  room,
  players,
  me,
  answers,
  onCastVote,
  onCastHeart,
  onEvaluateRoundAndFinish,
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
      </div>

      {room.settings.categories.map((cat) => {
        return (
          <div key={cat} className="eval-category-block">
            <div className="eval-category-header">{cat}</div>
            
            <div className="eval-answers-grid">
              {players.map((p) => {
                // Find this player's answer sheet for current round
                const playerAnswerSheet = answers.find(
                  (a) => a.player_id === p.id && a.round_num === room.current_round
                );
                
                const rawAnswer = (playerAnswerSheet?.answers?.[cat] || '').trim();
                const hasAnswer = rawAnswer.length > 0;
                
                // Read votes & hearts
                const catVotes = playerAnswerSheet?.votes?.[cat] || {};
                const yesVotes = Object.values(catVotes).filter((v) => v === true).length;
                const noVotes = Object.values(catVotes).filter((v) => v === false).length;
                
                const heartsList = playerAnswerSheet?.hearts?.[cat] || [];
                const heartCount = heartsList.length;

                // Voting status for current user
                const myVote = catVotes[me.id]; // true, false or undefined
                const myHeart = heartsList.includes(me.id);

                const isMe = p.id === me.id;
                
                // If downvoted by more players than upvoted, mark as rejected
                const isRejected = noVotes > yesVotes;

                // Capitalized verification
                const enforceFirstLetter = room.settings.validateFirstLetter !== false;
                const startsWithCorrectLetter = hasAnswer && rawAnswer[0].toLowerCase() === room.current_letter.toLowerCase();
                const autoInvalid = enforceFirstLetter && hasAnswer && !startsWithCorrectLetter;

                return (
                  <div
                    key={p.id}
                    className={`eval-answer-row ${isRejected || autoInvalid ? 'rejected' : ''}`}
                  >
                    {/* Player Name */}
                    <span className="eval-player-name" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      {p.avatar ? (
                        <img
                          src={getPlayerAvatarUrl(p.user_id!, p.avatar)}
                          alt={p.name}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                            color: 'white',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold'
                          }}
                        >
                          {p.name[0].toUpperCase()}
                        </div>
                      )}
                      <span>
                        {p.name} {isMe ? ' (Ich)' : ''}
                      </span>
                    </span>

                    {/* Answer Text */}
                    {hasAnswer ? (
                      <span className="eval-answer-text">
                        {rawAnswer}
                        {autoInvalid && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                            (Falscher Anfangsbuchstabe)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="eval-answer-text empty">Keine Antwort</span>
                    )}

                    {/* Vote Actions (Disable if own answer or no answer written) */}
                    <div className="eval-actions">
                      {/* Yes Vote (Valid) */}
                      <div className="eval-btn-wrapper">
                        <button
                          className={`eval-btn ${myVote === true ? 'active-yes' : ''}`}
                          onClick={() => playerAnswerSheet && handleVote(playerAnswerSheet.id, cat, true)}
                          disabled={isMe || !hasAnswer || autoInvalid}
                          title={isMe ? 'Eigene Antwort' : 'Gültig'}
                        >
                          <Check size={16} />
                        </button>
                        {yesVotes > 0 && <span className="vote-counter" style={{ borderColor: 'var(--success)' }}>{yesVotes}</span>}
                      </div>

                      {/* No Vote (Invalid) */}
                      <div className="eval-btn-wrapper">
                        <button
                          className={`eval-btn ${myVote === false || autoInvalid ? 'active-no' : ''}`}
                          onClick={() => playerAnswerSheet && handleVote(playerAnswerSheet.id, cat, false)}
                          disabled={isMe || !hasAnswer || autoInvalid}
                          title={isMe ? 'Eigene Antwort' : 'Ungültig'}
                        >
                          <X size={16} />
                        </button>
                        {noVotes > 0 && <span className="vote-counter" style={{ borderColor: 'var(--danger)' }}>{noVotes}</span>}
                      </div>

                      {/* Creativity Heart */}
                      <div className="eval-btn-wrapper">
                        <button
                          className={`eval-btn ${myHeart ? 'active-heart' : ''}`}
                          onClick={() => playerAnswerSheet && handleHeart(playerAnswerSheet.id, cat)}
                          disabled={isMe || !hasAnswer}
                          title={isMe ? 'Eigene Antwort' : 'Kreativ-Herz'}
                        >
                          <Heart size={16} fill={myHeart ? 'var(--secondary)' : 'none'} />
                        </button>
                        {heartCount > 0 && <span className="vote-counter" style={{ borderColor: 'var(--secondary)' }}>{heartCount}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

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
    </div>
  );
}
