import { useEffect, useRef } from 'react';

export const useNotifications = (tasks) => {
  const notifiedTaskIds = useRef(new Set());

  // 1. Request Permission on Load
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  // 2. Check for due tasks every 30 seconds
  useEffect(() => {
    const checkTasks = () => {
      if (Notification.permission !== 'granted') return;

      const now = new Date();
      
      tasks.forEach(task => {
        if (task.is_completed || !task.due_date) return;
        
        const dueDate = new Date(task.due_date);
        const timeDiff = dueDate - now;

        // Notify if due within the next 5 minutes (and hasn't been notified yet)
        // timeDiff > 0 means it's in the future
        // timeDiff < 300000 means it's less than 5 mins away
        if (timeDiff > 0 && timeDiff < 300000 && !notifiedTaskIds.current.has(task.id)) {
          sendNotification(task);
          notifiedTaskIds.current.add(task.id);
        }
      });
    };

    const interval = setInterval(checkTasks, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [tasks]);

  const sendNotification = (task) => {
    // Visual Notification
    new Notification("MindDock Reminder ⏰", {
      body: `Upcoming: ${task.title}`,
      icon: '/vite.svg' // Uses default Vite icon, can be changed
    });

    // Audio Alert (Simple Beep)
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
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };
};