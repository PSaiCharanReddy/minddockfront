import { useState, useEffect, useRef } from 'react';
import { AiOutlineClose, AiOutlineCheck, AiOutlinePause, AiOutlinePlayCircle } from 'react-icons/ai';
import confetti from 'canvas-confetti';
import './FocusMode.css';

export default function FocusMode({ task, onClose, onComplete }) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isActive, setIsActive] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Timer finished!
      playAlarm();
      setIsActive(false);
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft]);

  const playAlarm = () => {
    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    audio.play().catch(e => console.log("Audio play failed", e));
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleComplete = () => {
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    onComplete(task);
    onClose();
  };

  return (
    <div className="focus-overlay">
      <div className="focus-container">
        <div className="focus-header">
          <span className="focus-badge">🎯 DEEP WORK MODE</span>
          <button onClick={onClose} className="focus-close"><AiOutlineClose /></button>
        </div>
        
        <div className="focus-content">
          <h2>{task?.title || "Focus Session"}</h2>
          <p className="focus-desc">{task?.description || "Stay focused. You got this."}</p>
          
          <div className="timer-display">
            {formatTime(timeLeft)}
          </div>

          <div className="focus-controls">
            <button onClick={() => setIsActive(!isActive)} className="toggle-btn">
              {isActive ? <AiOutlinePause /> : <AiOutlinePlayCircle />}
              {isActive ? "Pause" : "Resume"}
            </button>
            
            <button onClick={handleComplete} className="complete-btn">
              <AiOutlineCheck /> Mark Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}