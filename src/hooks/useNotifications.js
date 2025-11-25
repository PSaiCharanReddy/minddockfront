import { useEffect, useRef, useState } from 'react';

export const useNotifications = (tasks) => {
  const notifiedTaskIds = useRef(new Set());
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  // Function to manually request permission (Call this from a button click)
  const requestPermission = () => {
    if (typeof Notification === 'undefined') {
      alert("Notifications not supported on this device");
      return;
    }

    if (Notification.permission === 'granted') {
      alert("✅ Notifications are already enabled!");
      return;
    }

    if (Notification.permission === 'denied') {
      alert("⚠️ Notifications are blocked. Please enable in browser settings.");
      return;
    }

    // Ask for permission
    Notification.requestPermission().then((perm) => {
      setPermission(perm);
      if (perm === 'granted') {
        // Show test notification
        new Notification("MindDock Notifications Enabled 🎉", {
          body: "You'll now receive reminders for upcoming tasks!",
          icon: '🔔'
        });
      }
    });
  };

  // Check for due tasks every 60 seconds
  useEffect(() => {
    if (permission !== 'granted' || !tasks || tasks.length === 0) return;

    const checkTasks = () => {
      const now = new Date();
      
      tasks.forEach(task => {
        // Skip if already completed, has no due date, or already notified
        if (task.is_completed || !task.due_date || notifiedTaskIds.current.has(task.id)) {
          return;
        }
        
        const dueDate = new Date(task.due_date);
        const timeDiff = dueDate - now;

        // Notify if:
        // 1. Task is overdue (timeDiff < 0)
        // 2. OR due within the next 5 minutes (timeDiff < 5 min but > 0)
        // 3. AND hasn't been notified yet
        const isOverdue = timeDiff < 0;
        const isDueSoon = timeDiff > 0 && timeDiff < 300000; // 5 minutes = 300000ms

        if ((isOverdue || isDueSoon) && !notifiedTaskIds.current.has(task.id)) {
          sendNotification(task, isOverdue);
          notifiedTaskIds.current.add(task.id);
        }
      });
    };

    // Check immediately and then every 60 seconds
    checkTasks();
    const interval = setInterval(checkTasks, 60000);
    return () => clearInterval(interval);
  }, [tasks, permission]);

  const sendNotification = (task, isOverdue = false) => {
    try {
      const title = isOverdue ? "⚠️ Overdue Task" : "⏰ Task Reminder";
      const body = `${task.title}${isOverdue ? ' (Overdue!)' : ' is due soon'}`;
      
      new Notification(title, {
        body: body,
        icon: isOverdue ? '⚠️' : '📌',
        tag: `task-${task.id}`, // Prevents duplicate notifications
        requireInteraction: isOverdue // Overdue tasks need user interaction to dismiss
      });
      
      playNotificationSound();
    } catch (e) {
      console.error("Notification failed", e);
    }
  };

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      
      // Play two beeps for notification
      const playBeep = (frequency, startTime) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, startTime);
        gain.gain.setValueAtTime(0.15, startTime);
        osc.start(startTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, startTime + 0.3);
        osc.stop(startTime + 0.3);
      };
      
      const now = ctx.currentTime;
      playBeep(587.33, now);      // First beep (D5 note)
      playBeep(587.33, now + 0.4); // Second beep with gap
      
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  return { requestPermission, permission };
};
