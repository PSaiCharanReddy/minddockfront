import { AiOutlineClose, AiOutlineHome, AiOutlineBulb, AiOutlineCheckCircle, AiOutlineCalendar, AiOutlineTrophy, AiOutlineBook, AiOutlineRobot, AiOutlineSound, AiOutlineFileText } from 'react-icons/ai';
import { BsChatDots } from 'react-icons/bs';
import './About.css';

export default function About({ isOpen, onClose }) {
  if (!isOpen) return null;

  const features = [
    {
      icon: <AiOutlineHome />,
      title: 'Dashboard',
      description: 'Your central hub displaying quick stats, upcoming tasks, active goals, and recent notes. Get a bird\'s eye view of your productivity at a glance.'
    },
    {
      icon: <AiOutlineBulb />,
      title: 'Mind Mapping',
      description: 'Create visual maps of your ideas with AI assistance. Connect concepts, generate roadmaps automatically, and organize your thoughts spatially. Right-click on nodes for powerful actions.'
    },
    {
      icon: <AiOutlineCheckCircle />,
      title: 'Task Manager',
      description: 'Manage your daily tasks with due dates, categories, and priorities. Mark tasks complete and get instant confetti celebration. Tasks sync with your calendar view.'
    },
    {
      icon: <AiOutlineTrophy />,
      title: 'Goals Tracker',
      description: 'Set long-term goals and track progress with visual indicators. Link tasks to goals automatically. AI suggests next steps and keeps you motivated.'
    },
    {
      icon: <AiOutlineBook />,
      title: 'Journal',
      description: 'Capture your thoughts, reflections, and ideas in a personal journal. Search through entries and use AI to analyze patterns and themes in your writing.'
    },
    {
      icon: <AiOutlineCalendar />,
      title: 'Timetable',
      description: 'View your schedule in a beautiful calendar format. See all tasks by day, week, or month. Drag and drop to reschedule items effortlessly.'
    },
    {
      icon: <BsChatDots />,
      title: 'AI Chat Assistant',
      description: 'Talk to Claude, your AI productivity coach. Ask for help with planning, get task suggestions, create mind maps through conversation, and receive personalized insights.'
    },
    {
      icon: <AiOutlineSound />,
      title: 'Voice Agent',
      description: 'Control MindDock hands-free with voice commands. Create tasks, navigate pages, search your data, and interact naturally using speech.'
    },
    {
      icon: <AiOutlineRobot />,
      title: 'AI Insights',
      description: 'Get intelligent recommendations based on your activity. Identifies overdue tasks, suggests task decomposition, and provides actionable insights to boost productivity.'
    },
    {
      icon: <AiOutlineFileText />,
      title: 'File Center',
      description: 'Universal input hub for importing documents, PDFs, and text files. AI processes your files and converts them into structured mind maps or tasks.'
    }
  ];

  const shortcuts = [
    { key: 'Ctrl/Cmd + K', action: 'Open Command Palette (Quick Search)' },
    { key: 'Ctrl/Cmd + Z', action: 'Undo last action' },
    { key: 'Ctrl/Cmd + Y', action: 'Redo last action' },
    { key: 'Ctrl/Cmd + C', action: 'Copy selected nodes/edges' },
    { key: 'Ctrl/Cmd + V', action: 'Paste copied items' },
    { key: 'Right Click', action: 'Context menu on nodes/edges' }
  ];

  return (
    <div className="about-overlay">
      <div className="about-container">
        <div className="about-header">
          <div className="about-logo-section">
            <div className="about-logo">🧠</div>
            <div>
              <h2>About MindDock</h2>
              <p className="about-version">Version 1.0.0 • AI-Powered Personal Organizer</p>
            </div>
          </div>
          <button onClick={onClose} className="about-close-btn">
            <AiOutlineClose />
          </button>
        </div>

        <div className="about-body">
          <section className="about-intro">
            <h3>What is MindDock?</h3>
            <p>
              MindDock is your intelligent companion for organizing thoughts, managing tasks, and achieving goals. 
              Powered by advanced AI (Claude), it combines mind mapping, task management, journaling, and smart 
              insights into one seamless experience.
            </p>
            <p>
              Whether you're planning projects, brainstorming ideas, or tracking personal growth, MindDock adapts 
              to your workflow and helps you stay productive.
            </p>
          </section>

          <section className="about-features">
            <h3>Features & Pages</h3>
            <div className="features-grid">
              {features.map((feature, index) => (
                <div key={index} className="feature-card">
                  <div className="feature-icon">{feature.icon}</div>
                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="about-shortcuts">
            <h3>Keyboard Shortcuts</h3>
            <div className="shortcuts-list">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="shortcut-item">
                  <kbd>{shortcut.key}</kbd>
                  <span>{shortcut.action}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="about-tips">
            <h3>Pro Tips</h3>
            <ul>
              <li><strong>Start with the Dashboard:</strong> It gives you a complete overview of everything.</li>
              <li><strong>Use Voice Agent:</strong> Try saying "Create a task for tomorrow" or "Show my goals".</li>
              <li><strong>Right-click on nodes:</strong> Access powerful actions like generating AI roadmaps.</li>
              <li><strong>Link tasks to goals:</strong> This helps track progress automatically.</li>
              <li><strong>Journal regularly:</strong> Use "Analyze Patterns" to get insights from your entries.</li>
              <li><strong>Check AI Insights:</strong> Get personalized recommendations to improve productivity.</li>
            </ul>
          </section>

          <section className="about-footer">
            <p>Built with ❤️ using React, FastAPI, and Claude AI</p>
            <p className="about-tagline">Your mind, organized. Your goals, achieved.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
