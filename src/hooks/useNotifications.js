import { useEffect, useRef, useState } from 'react';
import apiClient from '../api';

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
          body: "You'll now receive reminders for upcoming tasks!",
          icon: '🔔'
        });
      }
    });
  };

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
      });

      notification.onclick = () => {
        window.focus();
        if (onNavigate) onNavigate('tasks');
        notification.close();
      };
    } catch (e) {
      console.error("Notification failed", e);
    }
  };

  const sendEmailAlert = async (task, isOverdue = false) => {
    try {
      // Use apiClient which has correct baseURL
      await apiClient.post('/email/send-alert', {
        task_id: task.id,
        task_title: task.title,
        due_date: task.due_date,
        is_overdue: isOverdue
      });
    } catch (error) {
      // Silent fail - email is optional
      console.log("Email not sent (service optional)");
    }
  };

  return { requestPermission, permission };
};
