import { useEffect } from 'react';
import { useGameRoom } from './hooks/useGameRoom';
import { LandingPage } from './components/LandingPage';
import { GameLobby } from './components/GameLobby';
import { LetterSpinner } from './components/LetterSpinner';
import { GameActive } from './components/GameActive';
import { EvaluationPhase } from './components/EvaluationPhase';
import { RoundResults } from './components/RoundResults';
import { pb } from './pocketbase';

function App() {
  const {
    room,
    players,
    me,
    answers,
    isConnecting,
    error,
    createRoom,
    joinRoom,
    updateSettings,
    toggleReady,
    startRound,
    finishSpinning,
    submitAnswers,
    triggerStop,
    forceEvaluate,
    castVote,
    castHeart,
    evaluateRoundAndFinish,
    nextRound,
    leaveRoom,
    user,
    register,
    login,
    logout,
    updateProfile,
  } = useGameRoom();

  // Scroll to top automatically when game phase/status changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [room?.status]);

  // Helper action to restart a finished game (resets scores and goes back to lobby)
  const handleRestartGame = async () => {
    if (!room || !me?.is_host) return;
    try {
      
      // 1. Reset all players scores to 0 and ready checks to false
      for (const p of players) {
        await pb.collection('players').update(p.id, {
          points_total: 0,
          is_ready: false,
        });
      }
      
      // 2. Reset room configurations
      await pb.collection('rooms').update(room.id, {
        status: 'lobby',
        current_round: 1,
        current_letter: '',
        letters_used: [],
        stop_triggered_by: '',
      });
    } catch (err) {
      console.error('Failed to restart game:', err);
    }
  };

  return (
    <>
      {/* Background neon orbs effect */}
      <div className="bg-glow" />

      <main className="app-container">
        {/* Route views based on room status */}
        {!room && (
          <LandingPage
            onCreateRoom={createRoom}
            onJoinRoom={joinRoom}
            isConnecting={isConnecting}
            error={error}
            user={user}
            onRegister={register}
            onLogin={login}
            onLogout={logout}
            onUpdateProfile={updateProfile}
          />
        )}

        {room && room.status === 'lobby' && me && (
          <GameLobby
            room={room}
            players={players}
            me={me}
            onUpdateSettings={updateSettings}
            onToggleReady={toggleReady}
            onStartRound={startRound}
            onLeaveRoom={leaveRoom}
          />
        )}

        {room && room.status === 'spinning' && me && (
          <LetterSpinner
            currentLetter={room.current_letter}
            isHost={me.is_host}
            onFinishSpinning={finishSpinning}
          />
        )}

        {room && room.status === 'playing' && me && (
          <GameActive
            room={room}
            players={players}
            me={me}
            answers={answers}
            onSubmitAnswers={submitAnswers}
            onTriggerStop={triggerStop}
            onForceEvaluate={forceEvaluate}
          />
        )}

        {room && room.status === 'evaluating' && me && (
          <EvaluationPhase
            room={room}
            players={players}
            me={me}
            answers={answers}
            onCastVote={castVote}
            onCastHeart={castHeart}
            onEvaluateRoundAndFinish={evaluateRoundAndFinish}
          />
        )}

        {room && (room.status === 'results' || room.status === 'finished') && me && (
          <RoundResults
            room={room}
            players={players}
            me={me}
            answers={answers}
            onNextRound={nextRound}
            onRestartGame={handleRestartGame}
            onLeaveRoom={leaveRoom}
          />
        )}
      </main>
    </>
  );
}

export default App;
