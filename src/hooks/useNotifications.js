import { useEffect, useRef, useState } from 'react';

export const useNotifications = (tasks, onNavigate) => {
  const notifiedTaskIds = useRef(new Set());
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

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

    Notification.requestPermission().then((perm) => {
      setPermission(perm);
      if (perm === 'granted') {
        new Notification("MindDock Notifications Enabled 🎉", {
          body: "You'll now receive reminders for upcoming tasks! Click notification to jump to tasks.",
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
        if (task.is_completed || !task.due_date || notifiedTaskIds.current.has(task.id)) {
          return;
        }
        
        const dueDate = new Date(task.due_date);
        const timeDiff = dueDate - now;

        const isOverdue = timeDiff < 0;
        const isDueSoon = timeDiff > 0 && timeDiff < 300000; // 5 minutes

        if ((isOverdue || isDueSoon) && !notifiedTaskIds.current.has(task.id)) {
          sendNotification(task, isOverdue, onNavigate);
          notifiedTaskIds.current.add(task.id);
          
          // SEND EMAIL ALERT
          sendEmailAlert(task, isOverdue);
        }
      });
    };

    checkTasks();
    const interval = setInterval(checkTasks, 60000);
    return () => clearInterval(interval);
  }, [tasks, permission, onNavigate]);

  const sendNotification = (task, isOverdue = false, onNavigate) => {
    try {
      const title = isOverdue ? "⚠️ Overdue Task" : "⏰ Task Reminder";
      const body = `${task.title}${isOverdue ? ' (Overdue!)' : ' is due soon'}`;
      
      const notification = new Notification(title, {
        body: body,
        icon: isOverdue ? '⚠️' : '📌',
        tag: `task-${task.id}`,
        requireInteraction: isOverdue,
        badge: '🔔'
      });

      // CLICK HANDLER - Navigate to tasks page
      notification.onclick = () => {
        console.log("🔔 Notification clicked - navigating to tasks");
        
        // Bring window to front
        window.focus();
        
        // Navigate to tasks page
        if (onNavigate) {
          onNavigate('tasks');
        }
        
        // Close notification
        notification.close();
      };
      
      playNotificationSound();
    } catch (e) {
      console.error("Notification failed", e);
    }
  };

  const sendEmailAlert = async (task, isOverdue = false) => {
    try {
      console.log("📧 Sending email alert for task:", task.title);
      
      const response = await fetch('/api/email/send-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task_id: task.id,
          task_title: task.title,
          due_date: task.due_date,
          is_overdue: isOverdue
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Email sent successfully:", data.message);
      } else {
        console.log("⚠️ Email service unavailable");
      }
    } catch (error) {
      console.error("📧 Email sending failed:", error);
      // Don't show error to user - graceful fallback
    }
  };

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      
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
      playBeep(587.33, now);
      playBeep(587.33, now + 0.4);
      
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  return { requestPermission, permission };
};
