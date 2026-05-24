import { useState, useEffect } from 'react';
import { audioHelper } from '../utils/AudioHelper';

interface LetterSpinnerProps {
  currentLetter: string;
  isHost: boolean;
  onFinishSpinning: () => void;
}

export function LetterSpinner({ currentLetter, isHost, onFinishSpinning }: LetterSpinnerProps) {
  const [displayedLetter, setDisplayedLetter] = useState('?');
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    let ticks = 0;
    let intervalTime = 60;
    let timerId: any;

    const tick = () => {
      ticks++;
      const chars = 'ABCDEFGHIJKLMNOPRSTUVW';
      const randomChar = chars[Math.floor(Math.random() * chars.length)];
      setDisplayedLetter(randomChar);
      
      // Play a ticking sound
      audioHelper.playTick();

      if (ticks < 20) {
        timerId = setTimeout(tick, intervalTime);
      } else if (ticks < 27) {
        // Slow down the spinner
        intervalTime += 80;
        timerId = setTimeout(tick, intervalTime);
      } else {
        // Land on the final selected letter
        setDisplayedLetter(currentLetter);
        setIsDone(true);
        audioHelper.playStart();
        
        // Host advances the room state to 'playing' after a short delay
        if (isHost) {
          setTimeout(() => {
            onFinishSpinning();
          }, 1800);
        }
      }
    };

    timerId = setTimeout(tick, intervalTime);

    return () => clearTimeout(timerId);
  }, [currentLetter, isHost]);

  return (
    <div className="glass-card fade-in spinner-container" style={{ textAlign: 'center', maxWidth: '450px' }}>
      <h2 style={{ fontSize: '1.4rem' }}>Der Buchstabe wird ermittelt...</h2>
      
      <div className={`spinner-wheel ${!isDone ? 'spinning' : ''}`}>
        {displayedLetter}
      </div>

      {isDone ? (
        <h3 className="fade-in" style={{ color: 'var(--success)', fontSize: '1.4rem', marginTop: '1rem' }}>
          Gespielt wird mit: <strong style={{ fontSize: '1.8rem' }}>{currentLetter}</strong>!
        </h3>
      ) : (
        <p className="spinning-sub">Der Buchstabengenerator dreht sich...</p>
      )}
    </div>
  );
}
