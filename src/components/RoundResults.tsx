import { Trophy, RefreshCw, ArrowRight, LogOut, CheckCircle, Heart } from 'lucide-react';
import type { RoomRecord, PlayerRecord, AnswerRecord } from '../hooks/useGameRoom';
import { Confetti } from './Confetti';
import { audioHelper } from '../utils/AudioHelper';
import { getPlayerAvatarUrl } from '../pocketbase';

interface RoundResultsProps {
  room: RoomRecord;
  players: PlayerRecord[];
  me: PlayerRecord;
  answers: AnswerRecord[];
  onNextRound: () => Promise<void>;
  onRestartGame: () => Promise<void>;
  onLeaveRoom: () => Promise<void>;
}

export function RoundResults({
  room,
  players,
  me,
  answers,
  onNextRound,
  onRestartGame,
  onLeaveRoom,
}: RoundResultsProps) {
  
  const isGameFinished = room.status === 'finished';

  // Sort players by total score
  const sortedPlayers = [...players].sort((a, b) => (b.points_total || 0) - (a.points_total || 0));

  // Helper to calculate round points for a player
  const getRoundPoints = (playerId: string) => {
    const ans = answers.find(
      (a) => a.player_id === playerId && a.round_num === room.current_round
    );
    if (!ans || !ans.points) return 0;
    return Object.values(ans.points).reduce((sum, val) => sum + val, 0);
  };

  const handleNextRound = async () => {
    audioHelper.playClick();
    await onNextRound();
  };

  const handleRestart = async () => {
    audioHelper.playStart();
    await onRestartGame();
  };

  return (
    <div className="fade-in" style={{ width: '100%', maxWidth: '850px' }}>
      {isGameFinished && <Confetti />}

      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        {isGameFinished ? (
          <>
            <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }} className="results-title">
              <Trophy color="var(--warning)" size={36} /> Spiel beendet!
            </h2>
            <p style={{ color: 'var(--text-muted)' }}>Herzlichen Glückwunsch an den Gewinner!</p>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '1.8rem' }} className="results-title">Ergebnisse Runde {room.current_round}</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Gespielter Buchstabe:{' '}
              <strong style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>
                "{room.current_letter}"
              </strong>
            </p>
          </>
        )}
      </div>

      {/* Podium for top 3 players (Only when game is finished) */}
      {isGameFinished && players.length > 0 && (
        <div className="podium-container">
          {/* Second Place (Left) */}
          {sortedPlayers[1] && (
            <div className="podium-stand second">
              <div className="podium-avatar-wrapper">
                {sortedPlayers[1].avatar ? (
                  <img
                    src={getPlayerAvatarUrl(sortedPlayers[1].user_id!, sortedPlayers[1].avatar)}
                    alt={sortedPlayers[1].name}
                    className="podium-avatar"
                  />
                ) : (
                  <div className="podium-avatar-fallback">
                    {sortedPlayers[1].name[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="podium-rank">2</div>
              <div className="podium-name">{sortedPlayers[1].name}</div>
              <div className="podium-score">{sortedPlayers[1].points_total} Pkt</div>
            </div>
          )}

          {/* First Place (Center) */}
          {sortedPlayers[0] && (
            <div className="podium-stand first">
              <div className="podium-avatar-wrapper">
                {sortedPlayers[0].avatar ? (
                  <img
                    src={getPlayerAvatarUrl(sortedPlayers[0].user_id!, sortedPlayers[0].avatar)}
                    alt={sortedPlayers[0].name}
                    className="podium-avatar"
                  />
                ) : (
                  <div className="podium-avatar-fallback">
                    {sortedPlayers[0].name[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="podium-rank">1</div>
              <div className="podium-name" style={{ fontWeight: 'bold' }}>{sortedPlayers[0].name}</div>
              <div className="podium-score">{sortedPlayers[0].points_total} Pkt</div>
            </div>
          )}

          {/* Third Place (Right) */}
          {sortedPlayers[2] && (
            <div className="podium-stand third">
              <div className="podium-avatar-wrapper">
                {sortedPlayers[2].avatar ? (
                  <img
                    src={getPlayerAvatarUrl(sortedPlayers[2].user_id!, sortedPlayers[2].avatar)}
                    alt={sortedPlayers[2].name}
                    className="podium-avatar"
                  />
                ) : (
                  <div className="podium-avatar-fallback">
                    {sortedPlayers[2].name[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="podium-rank">3</div>
              <div className="podium-name">{sortedPlayers[2].name}</div>
              <div className="podium-score">{sortedPlayers[2].points_total} Pkt</div>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="glass-card" style={{ padding: '1.5rem', width: '100%', margin: '0 0 2rem 0' }}>
        <h3 className="section-title">
          <Trophy size={18} /> Rangliste
        </h3>
        <table className="scoreboard-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Platz</th>
              <th>Name</th>
              {!isGameFinished && <th style={{ textAlign: 'right' }}>Runden-Punkte</th>}
              <th style={{ textAlign: 'right' }}>Gesamt-Punkte</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((p, idx) => {
              const rPoints = getRoundPoints(p.id);
              const isWinner = isGameFinished && idx === 0;
              return (
                <tr key={p.id} style={{ fontWeight: isWinner ? 'bold' : 'normal' }}>
                  <td>
                    {idx + 1 === 1 ? '🥇' : idx + 1 === 2 ? '🥈' : idx + 1 === 3 ? '🥉' : `${idx + 1}.`}
                  </td>
                  <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                      {p.name} {p.id === me.id ? ' (Ich)' : ''}
                    </span>
                  </td>
                  {!isGameFinished && (
                    <td style={{ textAlign: 'right' }}>
                      <span className={`score-change-badge ${rPoints > 0 ? 'score-plus' : 'score-zero'}`}>
                        +{rPoints}
                      </span>
                    </td>
                  )}
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--accent)' }}>
                    {p.points_total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Answer breakdown for the round */}
      {!isGameFinished && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 className="section-title" style={{ fontSize: '1.1rem' }}>
            <CheckCircle size={18} /> Runden-Details (Antworten & Punkte)
          </h3>
          {players.map((p) => {
            const playerAnswerSheet = answers.find(
              (a) => a.player_id === p.id && a.round_num === room.current_round
            );
            if (!playerAnswerSheet) return null;

            return (
              <div key={p.id} className="breakdown-card">
                <div className="breakdown-player-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                    <span>{p.name}</span>
                  </div>
                  <span style={{ color: 'var(--accent)' }}>+{getRoundPoints(p.id)} Pkt</span>
                </div>
                <div className="breakdown-grid">
                  {room.settings.categories.map((cat) => {
                    const ansText = playerAnswerSheet.answers?.[cat] || '';
                    const score = playerAnswerSheet.points?.[cat] || 0;
                    const hearts = playerAnswerSheet.hearts?.[cat] || [];

                    return (
                      <div key={cat} className="breakdown-item">
                        <div>
                          <div className="breakdown-cat-name">{cat}</div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: ansText ? 'var(--text-main)' : 'rgba(255,255,255,0.2)' }}>
                            {ansText || 'Keine Antwort'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          {hearts.length > 0 && (
                            <span style={{ color: 'var(--secondary)', display: 'inline-flex', alignItems: 'center', fontSize: '0.75rem', gap: '0.1rem' }}>
                              <Heart size={12} fill="var(--secondary)" /> {hearts.length}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              color: score === 20 ? 'var(--accent)' : score >= 10 ? 'var(--success)' : score === 5 ? 'var(--warning)' : 'var(--text-muted)',
                            }}
                          >
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
      )}

      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        {me.is_host ? (
          isGameFinished ? (
            <button className="btn btn-primary" onClick={handleRestart} style={{ padding: '0.9rem 2rem' }}>
              <RefreshCw size={18} /> Noch einmal spielen
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleNextRound} style={{ padding: '0.9rem 2rem' }}>
              Nächste Runde <ArrowRight size={18} />
            </button>
          )
        ) : (
          !isGameFinished && (
            <div className="spinning-sub" style={{ color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Warte auf den Host für die nächste Runde...
            </div>
          )
        )}

        <button className="btn btn-secondary" onClick={onLeaveRoom} style={{ color: 'var(--danger)', borderColor: 'rgba(239, 35, 60, 0.2)' }}>
          <LogOut size={18} /> {isGameFinished ? 'Lobby verlassen' : 'Spiel verlassen'}
        </button>
      </div>
    </div>
  );
}
