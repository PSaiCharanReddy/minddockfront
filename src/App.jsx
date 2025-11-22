import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  MarkerType,
  getNodesBounds,
  getViewportForBounds,
  MiniMap,
} from '@xyflow/react';

import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti'; 
import { 
  AiOutlineLoading, 
  AiOutlineDownload, 
  AiOutlineCalendar, 
  AiOutlineTrophy, 
  AiOutlineHome, 
  AiOutlineBook, 
  AiOutlineSearch, 
  AiOutlineBell, 
  AiFillBell,
  AiOutlineBulb, 
  AiOutlinePlus
} from 'react-icons/ai'; 
import { BsChatDots } from 'react-icons/bs';

import '@xyflow/react/dist/style.css';
import './App.css';

// --- COMPONENTS ---
import apiClient from './api';
import CustomNode from './Components/CustomNode';
import ContextMenu from './Components/ContextMenu';
import AIChat from './Components/AIChat';
import Sidebar from './Components/Sidebar';       
import RightPanel from './Components/RightPanel'; // Unified Right Sidebar
import TimetableFull from './Components/TimetableFull';
import NodeDetails from './Components/NodeDetails';
import Dashboard from './Components/Dashboard';
import CommandPalette from './Components/CommandPalette';
import Recommendations from './Components/Recommendations';
import TopBar from './Components/TopBar';
import FocusMode from './Components/FocusMode';
import FileCenter from './Components/FileCenter'; // Universal Input
import VoiceAgent from './Components/VoiceAgent'; // Voice Mode

// --- HOOKS ---
import { useUndoRedo } from './hooks/useUndoRedo';
import { useNotifications } from './hooks/useNotifications';

let nodeId = 1000;

// --- NODE WRAPPER ---
function MindNode(props) {
  const { setNodes } = useReactFlow();
  const updateNodeLabel = useCallback((nodeId, label) => {
    setNodes((nds) => nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, label } } : node)));
  }, [setNodes]);
  const updateNodeSummary = useCallback((nodeId, summary) => {
    setNodes((nds) => nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, summary } } : node)));
  }, [setNodes]);
  return (
    <CustomNode
      {...props}
      onLabelChange={updateNodeLabel}
      onSummaryChange={updateNodeSummary}
      aiLoadingNode={props.aiLoadingNode}
    />
  );
}

// --- MAIN APP ---
function App() {
  // --- STATE: Map Data ---
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [maps, setMaps] = useState([]);
  const [currentMapId, setCurrentMapId] = useState(null);
  const [currentMapTitle, setCurrentMapTitle] = useState("");

  // --- STATE: User Data ---
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [notes, setNotes] = useState([]);

  // --- STATE: UI Toggles ---
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false); // Maps List
  const [rightPanel, setRightPanel] = useState({ isOpen: false, tab: 'tasks' }); // Unified Tools
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isRecOpen, setIsRecOpen] = useState(false);
  const [isTimetableFullOpen, setIsTimetableFullOpen] = useState(false);
  const [isFileCenterOpen, setIsFileCenterOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  
  const [selectedNodeForDetails, setSelectedNodeForDetails] = useState(null);
  const [focusTask, setFocusTask] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [aiLoadingNode, setAiLoadingNode] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('minddock-theme') || 'dark');
  
  // --- STATE: UTILS ---
  const [taskRefreshTrigger, setTaskRefreshTrigger] = useState(0);
  const [clipboard, setClipboard] = useState(null);

  // --- REFS & HOOKS ---
  const saveTimeout = useRef(null);
  const isLoaded = useRef(false);
  const reactFlowWrapper = useRef(null);
  const rfInstance = useReactFlow();
  const { takeSnapshot, undo, redo } = useUndoRedo();
  const { requestPermission, permission } = useNotifications(tasks);

  // --- 1. INITIAL DATA FETCH ---
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [mapRes, taskRes, goalRes, noteRes] = await Promise.all([
        apiClient.get('/map/'),
        apiClient.get('/tasks/'),
        apiClient.get('/goals/'),
        apiClient.get('/notes/')
      ]);
      setMaps(mapRes.data);
      setTasks(taskRes.data);
      setGoals(goalRes.data);
      setNotes(noteRes.data);
    } catch (error) {
      console.error("Init failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // --- 2. THEME ENGINE ---
  useEffect(() => {
    if (theme === 'light') document.body.classList.add('light-mode'); 
    else document.body.classList.remove('light-mode');
    localStorage.setItem('minddock-theme', theme);
  }, [theme]);
  
  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  // --- 3. UI HELPERS ---
  const triggerConfetti = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  const closeRightPanel = () => {
    setRightPanel(prev => ({ ...prev, isOpen: false }));
  };

  const closeAllPanels = () => {
    setIsLeftSidebarOpen(false);
    setRightPanel({ ...rightPanel, isOpen: false });
    setIsChatOpen(false);
    setContextMenu(null);
    setIsVoiceOpen(false);
    setIsFileCenterOpen(false);
  };

  const toggleRightPanel = (tab) => {
    if (rightPanel.isOpen && rightPanel.tab === tab) {
      closeRightPanel();
    } else {
      setIsChatOpen(false); // Auto-close chat when opening tools
      setRightPanel({ isOpen: true, tab: tab });
    }
  };

  const toggleChat = () => {
    if (!isChatOpen) {
        closeRightPanel(); // Auto-close tools when opening chat
    }
    setIsChatOpen(!isChatOpen);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
  };

  // --- 4. MAP MANAGEMENT ---
  const loadMap = async (id) => {
    if (id === null) { 
      setCurrentMapId(null); 
      setCurrentMapTitle("Dashboard"); 
      setNodes([]); setEdges([]);
      return; 
    }
    
    isLoaded.current = false;
    setIsLoading(true);
    
    try { 
      const response = await apiClient.get(`/map/${id}`);
      setNodes(response.data.nodes || []); 
      setEdges(response.data.edges || []); 
      setCurrentMapId(id);
      setCurrentMapTitle(response.data.title);
      setIsLeftSidebarOpen(false);
      
      if (response.data.nodes?.length > 0) { 
        const maxId = Math.max(0, ...response.data.nodes.map(n => parseInt(n.id, 10) || 0)); 
        nodeId = maxId + 100; 
      }
    } catch (error) { console.error(error); } 
    finally { 
      setIsLoading(false); 
      setTimeout(() => { isLoaded.current = true; if(nodes.length>0) rfInstance.fitView(); }, 500); 
    }
  };

  const createMap = async (title) => {
    try {
      setIsLoading(true);
      const res = await apiClient.post('/map/', { title });
      setMaps(p => [...p, {id:res.data.id, title:res.data.title}]);
      await loadMap(res.data.id);
    } catch(e) { console.error(e); setIsLoading(false); }
  };

  const deleteMap = async (id) => {
    if(!window.confirm("Delete this map?")) return;
    try { 
      await apiClient.delete(`/map/${id}`); 
      setMaps(maps.filter(m=>m.id!==id)); 
      if(currentMapId===id) loadMap(null);
    } catch(e){console.error(e);}
  };

  // Auto Save
  useEffect(() => {
    if (!isLoaded.current || !currentMapId) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    
    setIsSaving(true);
    saveTimeout.current = setTimeout(async () => {
      try {
        const currentMap = maps.find(m => m.id === currentMapId);
        await apiClient.put(`/map/${currentMapId}`, { 
          title: currentMap ? currentMap.title : "Untitled", 
          nodes: nodes.map(({ selected, dragging, ...n }) => n), 
          edges 
        });
      } catch (error) { console.error("Save failed:", error); } 
      finally { setIsSaving(false); }
    }, 1500);
  }, [nodes, edges, currentMapId, maps]);

  // --- 5. ACTIONS ---
  const downloadImage = async () => {
    await rfInstance.fitView({ padding: 0.4 });
    setTimeout(() => {
      const viewport = reactFlowWrapper.current.querySelector('.react-flow__viewport');
      if (!viewport) return;
      const bgColor = theme === 'light' ? '#f4f4f9' : '#1a1a1a';
      toPng(viewport, { backgroundColor: bgColor, width: viewport.getBoundingClientRect().width, height: viewport.getBoundingClientRect().height, pixelRatio: 2, style: { transform: `translate(0, 0)` } }).then((dataUrl) => { const a = document.createElement('a'); a.setAttribute('download', `minddock-map-${Date.now()}.png`); a.setAttribute('href', dataUrl); a.click(); });
    }, 500);
  };

  const handleNavigate = (item) => {
    if (item.type === 'node') {
      rfInstance.fitView({ nodes: [{ id: item.id }], duration: 800, padding: 2 });
      setNodes(nds => nds.map(n => ({...n, selected: n.id === item.id})));
    } else if (item.type === 'task') toggleRightPanel('tasks'); 
    else if (item.type === 'goal') toggleRightPanel('goals'); 
    else if (item.type === 'note') toggleRightPanel('journal');
  };

  const saveNodeDetails = (id, details) => {
    takeSnapshot(nodes, edges);
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) { return { ...n, data: { ...n.data, notes: details.notes, link: details.link } }; }
      return n;
    }));
    setSelectedNodeForDetails(null);
  };

  const handleTaskComplete = async (task) => {
    try {
      await apiClient.put(`/tasks/${task.id}/status?completed=true`);
      fetchAllData();
      triggerConfetti();
    } catch(e) { console.error(e); }
  };

  const addToTimetable = async (node) => {
    if (!node || !node.data.label) return;
    try {
      await apiClient.post('/tasks/', { title: node.data.label, description: node.data.summary, due_date: new Date().toISOString() });
      fetchAllData(); 
      toggleRightPanel('tasks'); 
      setTaskRefreshTrigger(p => p+1);
    } catch (error) { console.error(error); alert("Failed to add task."); }
  };

  const addToGoals = async (node) => {
    if (!node || !node.data.label) return;
    try {
      await apiClient.post('/goals/', { title: node.data.label, target_date: null, progress_percentage: 0 });
      await fetchAllData();
      toggleRightPanel('goals'); 
    } catch (error) { console.error("Failed to add goal:", error); }
  };

  // --- 6. AI LOGIC ---
  const planRoadmapSchedule = async (startNodeId) => {
    const connectedNodes = [];
    const queue = [startNodeId];
    const visited = new Set();
    visited.add(startNodeId);

    while (queue.length > 0) {
      const currId = queue.shift();
      const node = nodes.find(n => n.id === currId);
      if (node) connectedNodes.push(node);
      const relatedEdges = edges.filter(e => e.source === currId || e.target === currId);
      relatedEdges.forEach(edge => {
        const neighborId = edge.source === currId ? edge.target : edge.source;
        if (!visited.has(neighborId)) { visited.add(neighborId); queue.push(neighborId); }
      });
    }

    if(!window.confirm(`Ask AI to create a smart schedule for ${connectedNodes.length} items?`)) return;

    try {
      setIsLoading(true);
      const response = await apiClient.post('/ai/schedule', { nodes: connectedNodes });
      const aiTasks = response.data.tasks;
      const today = new Date();
      
      for (const task of aiTasks) {
        const taskDate = new Date(today);
        taskDate.setDate(today.getDate() + task.days_from_now);
        taskDate.setHours(9, 0, 0, 0);

        await apiClient.post('/tasks/', {
          title: task.title,
          description: `Estimated effort: ${task.duration_hours} hours`,
          due_date: taskDate.toISOString()
        });
      }
      
      await fetchAllData();
      toggleRightPanel('tasks');
    } catch (error) {
      console.error("Scheduling failed:", error);
      alert("Failed to create schedule.");
    } finally {
      setIsLoading(false);
    }
  };

  const generateRoadmap = useCallback(async (sourceNode) => {
    if (!sourceNode || !sourceNode.data || !sourceNode.data.label) return;
    takeSnapshot(nodes, edges); 
    setAiLoadingNode(sourceNode.id);
    
    try {
      const response = await apiClient.post('/ai/generate-roadmap', { topic: sourceNode.data.label });
      const steps = response.data.steps;
      if (!steps || steps.length === 0) throw new Error("No steps returned");
      if (steps.length === 1 && steps[0].toLowerCase().includes("error")) {
          alert(`AI Error: ${steps[0]}`); return;
      }

      let newNodes = []; let newEdges = []; let lastNodeId = sourceNode.id;
      steps.forEach((step, index) => {
        const newNodeId = `${nodeId++}`;
        newNodes.push({ id: newNodeId, type: 'mindNode', position: { x: sourceNode.position.x, y: sourceNode.position.y + (index * 90) + 120 }, data: { label: step, style: { backgroundColor: '#2a2a2a', color: '#f0f0f0' }, summary: '' } });
        newEdges.push({ id: `e-${lastNodeId}-${newNodeId}`, source: lastNodeId, target: newNodeId, markerEnd: { type: MarkerType.ArrowClosed } });
        lastNodeId = newNodeId;
      });
      setNodes((nds) => nds.concat(newNodes)); setEdges((eds) => eds.concat(newEdges));
      setTimeout(() => rfInstance.fitView({ duration: 500, nodes: [sourceNode, ...newNodes] }), 100);
    } catch (error) { console.error(error); } finally { setAiLoadingNode(null); }
  }, [rfInstance, setNodes, setEdges, nodes, edges, takeSnapshot]);

  const onAiGeneratedMap = useCallback((newMapData) => {
    takeSnapshot(nodes, edges);
    const { x, y, zoom } = rfInstance.getViewport();
    const centerX = -x / zoom + (window.innerWidth / 2) / zoom || 0;
    const centerY = -y / zoom + (window.innerHeight / 2) / zoom || 0;
    const idMap = new Map(); let newNodes = []; let newEdges = [];
    newMapData.nodes.forEach(node => {
      const newId = `${nodeId++}`; idMap.set(node.id, newId);
      newNodes.push({ ...node, id: newId, position: { x: node.position.x + centerX, y: node.position.y + centerY } });
    });
    newMapData.edges.forEach(edge => {
      const src = idMap.get(edge.source); const tgt = idMap.get(edge.target);
      if (src && tgt) newEdges.push({ ...edge, id: `e-${src}-${tgt}`, source: src, target: tgt });
    });
    setNodes((nds) => [...nds, ...newNodes]); setEdges((eds) => [...eds, ...newEdges]);
    setTimeout(() => rfInstance.fitView({ duration: 500, nodes: newNodes }), 100);
  }, [rfInstance, setNodes, setEdges, nodes, edges, takeSnapshot]);

  // --- 7. COPY/PASTE & SELECTION ---
  const handleCopy = useCallback(() => { const selectedNodes = nodes.filter((n) => n.selected); const selectedEdges = edges.filter((e) => e.selected); if (selectedNodes.length > 0) setClipboard({ nodes: selectedNodes, edges: selectedEdges }); }, [nodes, edges]);
  const handlePaste = useCallback(() => { if (!clipboard || !clipboard.nodes.length) return; takeSnapshot(nodes, edges); const { x, y, zoom } = rfInstance.getViewport(); const centerX = -x / zoom + (window.innerWidth / 2) / zoom; const centerY = -y / zoom + (window.innerHeight / 2) / zoom; const copiedBounds = getNodesBounds(clipboard.nodes); const offsetX = centerX - (copiedBounds.x + copiedBounds.width / 2); const offsetY = centerY - (copiedBounds.y + copiedBounds.height / 2); const idMap = new Map(); const newNodes = []; const newEdges = []; clipboard.nodes.forEach((node) => { const newId = `${nodeId++}`; idMap.set(node.id, newId); newNodes.push({ ...node, id: newId, selected: true, position: { x: node.position.x + offsetX, y: node.position.y + offsetY }, data: { ...node.data } }); }); clipboard.edges.forEach((edge) => { const newSource = idMap.get(edge.source); const newTarget = idMap.get(edge.target); if (newSource && newTarget) { newEdges.push({ ...edge, id: `e-${newSource}-${newTarget}-${Date.now()}`, source: newSource, target: newTarget, selected: true }); } }); setNodes([...nodes.map(n => ({ ...n, selected: false })), ...newNodes]); setEdges([...edges.map(e => ({ ...e, selected: false })), ...newEdges]); }, [clipboard, nodes, edges, rfInstance, takeSnapshot]);
  const selectConnectedGroup = useCallback((startNodeId) => { const connectedNodeIds = new Set(); const connectedEdgeIds = new Set(); const queue = [startNodeId]; connectedNodeIds.add(startNodeId); while (queue.length > 0) { const curr = queue.shift(); const relEdges = edges.filter(e => e.source === curr || e.target === curr); relEdges.forEach(edge => { connectedEdgeIds.add(edge.id); const neighbor = edge.source === curr ? edge.target : edge.source; if (!connectedNodeIds.has(neighbor)) { connectedNodeIds.add(neighbor); queue.push(neighbor); } }); } setNodes((nds) => nds.map((n) => ({ ...n, selected: connectedNodeIds.has(n.id) }))); setEdges((eds) => eds.map((e) => ({ ...e, selected: connectedEdgeIds.has(e.id) }))); }, [nodes, edges, setNodes, setEdges]);

  // --- 8. EVENT LISTENERS & HANDLERS ---
  useEffect(() => { const handleKeyDown = (e) => { 
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return; 
    const isCtrl = e.metaKey || e.ctrlKey; 
    if (isCtrl && e.key === 'k') { e.preventDefault(); setIsPaletteOpen(prev => !prev); return; } 
    if (isCtrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(nodes, edges, setNodes, setEdges); } 
    if ((isCtrl && e.key === 'y') || (isCtrl && e.shiftKey && e.key === 'z')) { e.preventDefault(); redo(nodes, edges, setNodes, setEdges); } 
    if (isCtrl && e.key === 'c') { e.preventDefault(); handleCopy(); } 
    if (isCtrl && e.key === 'v') { e.preventDefault(); handlePaste(); } 
  }; window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); }, [nodes, edges, undo, redo, handleCopy, handlePaste]);

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), [setNodes]);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), [setEdges]);
  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);
  const onNodesDelete = useCallback(() => { takeSnapshot(nodes, edges); }, [nodes, edges, takeSnapshot]);
  const addNode = useCallback((options) => {
    takeSnapshot(nodes, edges);
    const newNode = { id: `${nodeId++}`, type: 'mindNode', position: options.position || { x: 100, y: 100 }, data: { label: 'Untitled', style: { backgroundColor: '#2a2a2a', color: '#f0f0f0' }, summary: '' } };
    setNodes((nds) => nds.concat(newNode)); return newNode;
  }, [setNodes, nodes, edges, takeSnapshot]);

  const handlePaneClick = useCallback(() => setContextMenu(null), []);
  const onNodeContextMenu = useCallback((event, node) => { event.preventDefault(); setContextMenu({ id: node.id, node: node, type: 'node', top: event.clientY, left: event.clientX }); }, []);
  const onEdgeContextMenu = useCallback((event, edge) => { event.preventDefault(); setContextMenu({ id: edge.id, type: 'edge', top: event.clientY, left: event.clientX }); }, []);
  const onPaneContextMenu = useCallback((event) => { event.preventDefault(); setContextMenu(null); closeAllPanels(); }, []);

  const handleMenuAction = useCallback((action, payload) => {
    if (['setNodeColor', 'setEdgeStyle'].includes(action)) takeSnapshot(nodes, edges);
    if (action === 'editDetails') { setSelectedNodeForDetails(contextMenu.node); }
    else if (action === 'addToTimetable') addToTimetable(contextMenu.node);
    else if (action === 'planRoadmap') planRoadmapSchedule(contextMenu.id);
    else if (action === 'addToGoals') addToGoals(contextMenu.node);
    else if (action === 'generateRoadmap') generateRoadmap(contextMenu.node);
    else if (action === 'selectGroup') selectConnectedGroup(contextMenu.id);
    else if (action === 'setNodeColor') setNodes((nds) => nds.map((n) => n.id === contextMenu.id ? { ...n, data: { ...n.data, style: { backgroundColor: payload.background, color: payload.text } } } : n));
    else if (action === 'setEdgeStyle') setEdges((eds) => eds.map((e) => e.id === contextMenu.id ? { ...e, markerEnd: payload === 'directional' ? { type: MarkerType.ArrowClosed } : undefined, style: payload === 'dotted' ? { strokeDasharray: '5 5' } : {} } : e));
    setContextMenu(null);
  }, [contextMenu, setNodes, setEdges, generateRoadmap, takeSnapshot, nodes, edges, selectConnectedGroup]);

  const nodeTypes = useMemo(() => ({ mindNode: (props) => <MindNode {...props} aiLoadingNode={aiLoadingNode} /> }), [aiLoadingNode]);

  // --- RENDER ---
  return (
    <div className={`app-container ${theme}`}>
      
      <TopBar 
        onToggleMaps={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        onToggleTasks={() => toggleRightPanel('tasks')}
        onToggleGoals={() => toggleRightPanel('goals')}
        onToggleJournal={() => toggleRightPanel('journal')}
        onToggleTheme={toggleTheme}
        onSearch={() => setIsPaletteOpen(true)}
        onExport={downloadImage}
        onChat={toggleChat}
        onInsights={() => setIsRecOpen(true)}
        onNotification={requestPermission}
        notificationPermission={permission}
        theme={theme}
        currentMapTitle={currentMapTitle || "Dashboard"}
        onGoHome={() => loadMap(null)}
        onOpenFileCenter={() => setIsFileCenterOpen(true)}
        onToggleVoice={() => setIsVoiceOpen(!isVoiceOpen)} // Pass Voice Toggle
      />

      <div className="react-flow-wrapper" ref={reactFlowWrapper} style={{ marginTop: '60px' }}>
        
        <div className="top-right-ui">
          <div className="save-indicator">{isSaving ? "Saving..." : "Saved"}</div>
        </div>

        {currentMapId ? (
          <>
             <button onClick={() => addNode({})} className="add-node-btn">+ Note</button>
             <ReactFlow
                nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodesDelete={onNodesDelete}
                nodeTypes={nodeTypes} onPaneClick={handlePaneClick} 
                onNodeContextMenu={onNodeContextMenu} 
                onEdgeContextMenu={onEdgeContextMenu}
                onPaneContextMenu={onPaneContextMenu}
              >
                <Background />
                <Controls />
                <MiniMap nodeColor={(n) => n.style?.backgroundColor || '#333'} style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }} zoomable pannable />
              </ReactFlow>
          </>
        ) : (
          <div className="dashboard-wrapper" style={{width:'100%', height:'100%', overflowY:'auto'}}>
             {isLoading ? <div className="loading-screen">Loading MindDock...</div> : 
                <Dashboard 
                  onOpenMap={loadMap} 
                  onOpenTimetable={() => toggleRightPanel('tasks')} 
                  onOpenGoals={() => toggleRightPanel('goals')} 
                />
             }
          </div>
        )}

        {contextMenu && <ContextMenu {...contextMenu} onAction={handleMenuAction} />}
      </div>
      
      {/* --- SIDEBARS & PANELS --- */}
      <Sidebar maps={maps} currentMapId={currentMapId} onSelectMap={loadMap} onCreateMap={createMap} onDeleteMap={deleteMap} isOpen={isLeftSidebarOpen} toggleSidebar={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)} />
      
      <RightPanel 
        isOpen={rightPanel.isOpen} 
        onClose={closeRightPanel} 
        activeTab={rightPanel.tab} 
        onTabChange={(tab) => setRightPanel({ isOpen: true, tab })} 
        taskRefreshTrigger={taskRefreshTrigger}
      />

      <AIChat 
        nodes={nodes} 
        edges={edges} 
        tasks={tasks} 
        goals={goals} 
        notes={notes}
        selectedNodes={nodes.filter(n => n.selected)} 
        onAiGeneratedMap={onAiGeneratedMap} 
        isOpen={isChatOpen} 
        toggleChat={toggleChat} 
      />
      
      {/* --- MODALS --- */}
      {isTimetableFullOpen && <TimetableFull isOpen={isTimetableFullOpen} onClose={() => setIsTimetableFullOpen(false)} />}
      
      <NodeDetails node={selectedNodeForDetails} isOpen={!!selectedNodeForDetails} onClose={() => setSelectedNodeForDetails(null)} onSave={saveNodeDetails} />
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} nodes={nodes} tasks={tasks} goals={goals} notes={notes} onNavigate={handleNavigate} />
      
      <Recommendations 
        isOpen={isRecOpen} 
        onClose={() => setIsRecOpen(false)} 
        tasks={tasks} 
        goals={goals} 
        notes={notes} 
        onRefresh={fetchAllData} 
      />

      {focusTask && <FocusMode task={focusTask} onClose={() => setFocusTask(null)} onComplete={handleTaskComplete} />}
      {isFileCenterOpen && <FileCenter isOpen={isFileCenterOpen} onClose={() => setIsFileCenterOpen(false)} onAiGeneratedMap={onAiGeneratedMap} />}
      
      <VoiceAgent 
         isOpen={isVoiceOpen} 
         onClose={() => setIsVoiceOpen(false)} 
         appRef={reactFlowWrapper} 
         onAction={onAiGeneratedMap}
         tasks={tasks}
         goals={goals}
         notes={notes}
         nodes={nodes}
         edges={edges} 
      />
    </div>
  );
}

export default function AppWrapper() { return <ReactFlowProvider><App /></ReactFlowProvider>; }