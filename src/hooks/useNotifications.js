import { useEffect, useRef, useState } from 'react';

export const useNotifications = (tasks) => {
  const notifiedTaskIds = useRef(new Set());
  const [permission, setPermission] = useState(Notification.permission);

  // Function to manually request permission (Call this from a button click)
  const requestPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then((perm) => {
        setPermission(perm);
      });
    }
  };

  // Check for due tasks every 30 seconds
  useEffect(() => {
    const checkTasks = () => {
      if (permission !== 'granted') return;

      const now = new Date();
      
      tasks.forEach(task => {
        if (task.is_completed || !task.due_date) return;
        
        const dueDate = new Date(task.due_date);
        const timeDiff = dueDate - now;

        // Notify if due within the next 5 minutes (and hasn't been notified yet)
        if (timeDiff > 0 && timeDiff < 300000 && !notifiedTaskIds.current.has(task.id)) {
          sendNotification(task);
          notifiedTaskIds.current.add(task.id);
        }
      });
    };

    const interval = setInterval(checkTasks, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [tasks, permission]);

  const sendNotification = (task) => {
    new Notification("MindDock Reminder ⏰", {
      body: `Upcoming: ${task.title}`,
      icon: '/vite.svg'
    });
    playNotificationSound();
  };

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  return { requestPermission, permission };
};