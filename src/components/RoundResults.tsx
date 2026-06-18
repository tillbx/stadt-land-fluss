import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, RefreshCw, ArrowRight, LogOut, CheckCircle, Heart } from 'lucide-react';
import type { RoomRecord, PlayerRecord, AnswerRecord } from '../hooks/useGameRoom';
import { Confetti } from './Confetti';
import { audioHelper } from '../utils/AudioHelper';
import { PlayerAvatar } from './PlayerAvatar';
import { GameChat } from './GameChat';

interface RoundResultsProps {
  room: RoomRecord;
  players: PlayerRecord[];
  me: PlayerRecord;
  answers: AnswerRecord[];
  onNextRound: () => Promise<void>;
  onRestartGame: () => Promise<void>;
  onLeaveRoom: () => Promise<void>;
  messages: any[];
  onSendChatMessage: (text: string) => Promise<void>;
  onSendEmote: (emoji: string) => Promise<void>;
  onSetTypingStatus: (isTyping: boolean) => void | Promise<void>;
}

function PointsLineChart({ room, players }: { room: RoomRecord; players: PlayerRecord[] }) {
  const maxRounds = room.current_round;
  const colors = ['#6366f1', '#ec4899', '#10b981', '#fbbf24', '#0ea5e9', '#a78bfa', '#f43f5e'];

  const playersHistory = players.map((p) => {
    const points = [0];
    for (let r = 1; r <= maxRounds; r++) {
      const roundScores = room.settings?.pointsHistory?.[r] || {};
      const score = p?.id && roundScores[p.id] !== undefined ? roundScores[p.id] : (points[r - 1] || 0);
      points.push(score);
    }
    return {
      player: p,
      points
    };
  });

  const allScores = playersHistory.flatMap(h => h.points);
  const maxPoints = Math.max(10, ...allScores);
  const yMax = Math.ceil(maxPoints / 20) * 20;

  const width = 600;
  const height = 300;
  const chartWidth = 440;
  const chartHeight = 240;
  const offsetX = 45;
  const offsetY = 20;

  const gridLines = [];
  for (let i = 0; i <= 4; i++) {
    gridLines.push(Math.round((yMax / 4) * i));
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', maxWidth: '100%', height: 'auto' }}>
      <defs>
        {/* Glow filter */}
        <filter id="chart-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Gradient under lines */}
        {playersHistory.map((h, playerIdx) => {
          if (!h.player?.id) return null;
          const playerColor = colors[playerIdx % colors.length];
          return (
            <linearGradient key={`grad-${h.player.id}`} id={`grad-${h.player.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={playerColor} stopOpacity={0.25} />
              <stop offset="100%" stopColor={playerColor} stopOpacity={0.0} />
            </linearGradient>
          );
        })}
      </defs>

      {/* Grid lines */}
      {gridLines.map((val) => {
        const y = offsetY + chartHeight - (val / yMax) * chartHeight;
        return (
          <g key={val}>
            <line
              x1={offsetX}
              y1={y}
              x2={offsetX + chartWidth}
              y2={y}
              stroke="rgba(255, 255, 255, 0.05)"
              strokeDasharray="3 6"
            />
            <text
              x={offsetX - 10}
              y={y + 4}
              textAnchor="end"
              fill="var(--text-muted)"
              fontSize={10}
              fontFamily="var(--font-body)"
              fontWeight={500}
            >
              {val}
            </text>
          </g>
        );
      })}

      {/* X Axis Labels */}
      {Array.from({ length: maxRounds + 1 }, (_, r) => {
        const x = offsetX + (r / maxRounds) * chartWidth;
        return (
          <g key={r}>
            <line
              x1={x}
              y1={offsetY}
              x2={x}
              y2={offsetY + chartHeight}
              stroke="rgba(255, 255, 255, 0.03)"
            />
            <text
              x={x}
              y={offsetY + chartHeight + 18}
              textAnchor="middle"
              fill="var(--text-muted)"
              fontSize={10}
              fontFamily="var(--font-body)"
              fontWeight={500}
            >
              {r === 0 ? 'Start' : `R${r}`}
            </text>
          </g>
        );
      })}

      {/* Axis Lines */}
      <line
        x1={offsetX}
        y1={offsetY}
        x2={offsetX}
        y2={offsetY + chartHeight}
        stroke="rgba(255, 255, 255, 0.12)"
        strokeWidth={1}
      />
      <line
        x1={offsetX}
        y1={offsetY + chartHeight}
        x2={offsetX + chartWidth}
        y2={offsetY + chartHeight}
        stroke="rgba(255, 255, 255, 0.12)"
        strokeWidth={1}
      />

      {/* Player Area Gradients */}
      {playersHistory.map((h) => {
        if (!h.player?.id) return null;
        const pathD = h.points.map((score, r) => {
          const x = offsetX + (r / maxRounds) * chartWidth;
          const y = offsetY + chartHeight - (score / yMax) * chartHeight;
          return `${r === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');

        const firstX = offsetX;
        const lastX = offsetX + chartWidth;
        const bottomY = offsetY + chartHeight;
        const areaD = `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

        return (
          <path
            key={`area-${h.player.id}`}
            d={areaD}
            fill={`url(#grad-${h.player.id})`}
            stroke="none"
            style={{
              animation: 'chart-fade-in 1.5s ease-out forwards',
            }}
          />
        );
      })}

      {/* Player Lines */}
      {playersHistory.map((h, playerIdx) => {
        if (!h.player?.id) return null;
        const playerColor = colors[playerIdx % colors.length];
        const pathD = h.points.map((score, r) => {
          const x = offsetX + (r / maxRounds) * chartWidth;
          const y = offsetY + chartHeight - (score / yMax) * chartHeight;
          return `${r === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');

        return (
          <path
            key={h.player.id}
            d={pathD}
            fill="none"
            stroke={playerColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#chart-glow)"
            className="chart-line-animated"
          />
        );
      })}

      {/* Dots on top of lines for tooltips */}
      {playersHistory.map((h, playerIdx) => {
        if (!h.player?.id) return null;
        const playerColor = colors[playerIdx % colors.length];
        return h.points.map((score, r) => {
          const x = offsetX + (r / maxRounds) * chartWidth;
          const y = offsetY + chartHeight - (score / yMax) * chartHeight;
          return (
            <g key={`${h.player.id}-${r}`} className="chart-dot-group" transform={`translate(${x}, ${y})`}>
              <circle
                cx={0}
                cy={0}
                r={4.5}
                fill={playerColor}
                stroke="#13131a"
                strokeWidth={1.5}
              />
              <title>{`${h.player.name || ''}: ${score} Punkte (${r === 0 ? 'Start' : `Runde ${r}`})`}</title>
            </g>
          );
        });
      })}

      {/* Legends */}
      {playersHistory.map((h, playerIdx) => {
        if (!h.player?.id) return null;
        const playerColor = colors[playerIdx % colors.length];
        const x = offsetX + chartWidth + 15;
        const y = offsetY + 15 + playerIdx * 20;
        const pName = h.player.name || '';
        return (
          <g key={`legend-${h.player.id}`}>
            <circle cx={x} cy={y - 3} r={5} fill={playerColor} />
            <text
              x={x + 10}
              y={y}
              fill="var(--text-main)"
              fontSize={10}
              fontWeight={600}
              fontFamily="var(--font-body)"
            >
              {pName.length > 12 ? `${pName.substring(0, 10)}..` : pName}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function RoundResults({
  room,
  players,
  me,
  answers,
  onNextRound,
  onRestartGame,
  onLeaveRoom,
  messages,
  onSendChatMessage,
  onSendEmote,
  onSetTypingStatus,
}: RoundResultsProps) {
  
  const isGameFinished = room.status === 'finished';
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);

  // Inject path animation styles once
  useEffect(() => {
    if (!document.getElementById('chart-animation-styles')) {
      const style = document.createElement('style');
      style.id = 'chart-animation-styles';
      style.innerHTML = `
        @keyframes chart-draw-line {
          from {
            stroke-dashoffset: 1200;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes chart-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .chart-line-animated {
          stroke-dasharray: 1200;
          stroke-dashoffset: 1200;
          animation: chart-draw-line 2.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .chart-dot-group {
          transition: transform 0.2s ease;
        }
        .chart-dot-group:hover {
          transform: scale(1.3);
          transform-origin: center;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

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
    <div className="fade-in" style={{ width: '100%', maxWidth: '1100px', position: 'relative' }}>
      {isGameFinished && <Confetti />}

      {/* Leave Confirmation Overlay Dialog */}
      {showLeaveConfirm && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="glass-card" style={{
            padding: '2rem',
            textAlign: 'center',
            maxWidth: '400px',
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            border: '1px solid var(--danger-glow)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8), 0 0 20px var(--danger-glow)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--danger)' }}>
              <LogOut size={44} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', fontFamily: 'var(--font-title)' }}>Spiel verlassen?</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.4' }}>
                Möchtest du das Spiel wirklich verlassen und zur Startseite zurückkehren?
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1 }} 
                onClick={() => setShowLeaveConfirm(false)}
                type="button"
              >
                Nein
              </button>
              <button 
                className="btn btn-danger" 
                style={{ flex: 1 }} 
                onClick={async () => {
                  audioHelper.playClick();
                  await onLeaveRoom();
                }}
                type="button"
              >
                Ja, verlassen
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Header section with played letter and primary actions directly below */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
        {isGameFinished ? (
          <>
            <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }} className="results-title">
              <Trophy color="var(--warning)" size={36} /> Spiel beendet!
            </h2>
            <p style={{ color: 'var(--text-muted)' }}>Herzlichen Glückwunsch an den Gewinner!</p>
            
            <div style={{ marginTop: '0.4rem' }}>
              {me.is_host ? (
                <button className="btn btn-primary" onClick={handleRestart} style={{ padding: '0.8rem 2rem' }}>
                  <RefreshCw size={16} /> Noch einmal spielen
                </button>
              ) : (
                <div className="spinning-sub" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Warte auf den Host für ein neues Spiel...
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '0.2rem' }} className="results-title">Ergebnisse Runde {room.current_round}</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Gespielter Buchstabe:{' '}
              <strong style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>
                "{room.current_letter}"
              </strong>
            </p>

            <div style={{ marginTop: '0.4rem' }}>
              {me.is_host ? (
                <button className="btn btn-primary" onClick={handleNextRound} style={{ padding: '0.8rem 2rem' }}>
                  Nächste Runde <ArrowRight size={16} />
                </button>
              ) : (
                <div className="spinning-sub" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Warte auf den Host für die nächste Runde...
                </div>
              )}
            </div>
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
                <PlayerAvatar name={sortedPlayers[1].name} avatar={sortedPlayers[1].avatar} userId={sortedPlayers[1].user_id} className="podium-avatar" style={{ fontSize: '1.2rem' }} />
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
                <PlayerAvatar name={sortedPlayers[0].name} avatar={sortedPlayers[0].avatar} userId={sortedPlayers[0].user_id} className="podium-avatar" style={{ fontSize: '1.5rem' }} />
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
                <PlayerAvatar name={sortedPlayers[2].name} avatar={sortedPlayers[2].avatar} userId={sortedPlayers[2].user_id} className="podium-avatar" style={{ fontSize: '1.2rem' }} />
              </div>
              <div className="podium-rank">3</div>
              <div className="podium-name">{sortedPlayers[2].name}</div>
              <div className="podium-score">{sortedPlayers[2].points_total} Pkt</div>
            </div>
          )}
        </div>
      )}

      {/* Point history line chart (Only when game is finished) */}
      {isGameFinished && (
        <div className="glass-card" style={{ padding: '1.5rem', width: '100%', maxWidth: '100%', margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 className="section-title" style={{ width: '100%', marginBottom: '1.2rem' }}>
            📈 Punkteverlauf
          </h3>
          <div style={{ width: '100%', overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
            <PointsLineChart room={room} players={players} />
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="glass-card" style={{ padding: '1.5rem', width: '100%', maxWidth: '100%', margin: '0 0 2rem 0' }}>
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
            {sortedPlayers
              .slice(0, showAllLeaderboard ? sortedPlayers.length : 3)
              .map((p, idx) => {
                const rPoints = getRoundPoints(p.id);
                const isWinner = isGameFinished && idx === 0;
                return (
                  <tr key={p.id} style={{ fontWeight: isWinner ? 'bold' : 'normal' }}>
                    <td>
                      {idx + 1 === 1 ? '🥇' : idx + 1 === 2 ? '🥈' : idx + 1 === 3 ? '🥉' : `${idx + 1}.`}
                    </td>
                    <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div id={`avatar-${p.id}`} style={{ display: 'inline-flex' }}>
                        <PlayerAvatar 
                          name={p.name} 
                          avatar={p.avatar} 
                          userId={p.user_id} 
                          style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem' }} 
                        />
                      </div>
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

        {sortedPlayers.length > 3 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1.2rem' }}
              onClick={() => setShowAllLeaderboard(!showAllLeaderboard)}
              type="button"
            >
              {showAllLeaderboard ? 'Weniger anzeigen' : 'Alle ansehen'}
            </button>
          </div>
        )}
      </div>

      {/* Answer breakdown for the round */}
      {!isGameFinished && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 className="section-title" style={{ fontSize: '1.1rem' }}>
            <CheckCircle size={18} /> Runden-Details (Antworten & Punkte)
          </h3>
          <div className="results-breakdown-grid">
            {players.map((p) => {
              const playerAnswerSheet = answers.find(
                (a) => a.player_id === p.id && a.round_num === room.current_round
              );
              if (!playerAnswerSheet) return null;

              return (
                <div key={p.id} className="glass-card" style={{ padding: '1.5rem', width: '100%', maxWidth: '100%', margin: '0' }}>
                  <div className="breakdown-player-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <PlayerAvatar 
                        name={p.name} 
                        avatar={p.avatar} 
                        userId={p.user_id} 
                        style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem' }} 
                      />
                      <span>{p.name}</span>
                    </div>
                    <span style={{ color: 'var(--accent)' }}>+{getRoundPoints(p.id)} Pkt</span>
                  </div>
                  <div className="breakdown-grid">
                    {room.settings.categories.map((cat) => {
                      const ansText = playerAnswerSheet.answers?.[cat] || '';
                      const score = playerAnswerSheet.points?.[cat] || 0;
                      const hearts = playerAnswerSheet.hearts?.[cat] || [];
                      
                      const jokersStr = playerAnswerSheet.answers?._jokers || '';
                      const usedJoker = jokersStr.split(',').map((s: string) => s.trim().toLowerCase()).includes(cat.toLowerCase());

                      return (
                        <div key={cat} className="breakdown-item">
                          <div>
                            <div className="breakdown-cat-name">{cat}</div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: ansText ? 'var(--text-main)' : 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {ansText || 'Keine Antwort'}
                              {usedJoker && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 'bold' }} title="Joker benutzt">
                                  🃏 Joker
                                </span>
                              )}
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
        </div>
      )}

      {/* Leave Room Action Button at the very bottom in full size */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', width: '100%' }}>
        <button
          className="btn btn-secondary"
          onClick={() => setShowLeaveConfirm(true)}
          style={{
            color: 'var(--danger)',
            borderColor: 'rgba(239, 35, 60, 0.25)',
            width: '100%',
            maxWidth: '300px',
            padding: '0.9rem'
          }}
          type="button"
        >
          <LogOut size={16} /> {isGameFinished ? 'Lobby verlassen' : 'Spiel verlassen'}
        </button>
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
