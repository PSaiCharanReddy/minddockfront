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
  getNodesBounds, // <-- CHANGED THIS IMPORT
} from '@xyflow/react';
import { AiOutlineLoading } from 'react-icons/ai';
import { BsChatDots } from 'react-icons/bs';

import '@xyflow/react/dist/style.css';
import './App.css';

import apiClient from './api';
import CustomNode from './Components/CustomNode';
import ContextMenu from './Components/ContextMenu';
import AIChat from './Components/AIChat';
import Sidebar from './Components/Sidebar';
import { useUndoRedo } from './hooks/useUndoRedo';

let nodeId = 1000;

// --- Node Type Wrapper ---
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

function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  
  // --- Multi-Map State ---
  const [maps, setMaps] = useState([]);
  const [currentMapId, setCurrentMapId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // --- UI State ---
  const [contextMenu, setContextMenu] = useState(null);
  const [aiLoadingNode, setAiLoadingNode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // --- NEW: Clipboard State ---
  const [clipboard, setClipboard] = useState(null);

  // --- Refs & Hooks ---
  const saveTimeout = useRef(null);
  const isLoaded = useRef(false);
  const reactFlowWrapper = useRef(null);
  const rfInstance = useReactFlow();
  const { takeSnapshot, undo, redo } = useUndoRedo();

  // --- COPY & PASTE LOGIC ---
  const handleCopy = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter((e) => e.selected);
    
    if (selectedNodes.length > 0) {
      console.log(`Copied ${selectedNodes.length} nodes to clipboard.`);
      setClipboard({ nodes: selectedNodes, edges: selectedEdges });
    }
  }, [nodes, edges]);

  const handlePaste = useCallback(() => {
    if (!clipboard || !clipboard.nodes.length) return;

    takeSnapshot(nodes, edges); // Snapshot before pasting

    const { x, y, zoom } = rfInstance.getViewport();
    // Paste in the center of the screen
    const centerX = -x / zoom + (window.innerWidth / 2) / zoom;
    const centerY = -y / zoom + (window.innerHeight / 2) / zoom;

    // Calculate the center of the copied group to determine offset
    // USE THE CORRECT FUNCTION HERE:
    const copiedBounds = getNodesBounds(clipboard.nodes);
    
    const offsetX = centerX - (copiedBounds.x + copiedBounds.width / 2);
    const offsetY = centerY - (copiedBounds.y + copiedBounds.height / 2);

    const idMap = new Map();
    const newNodes = [];
    const newEdges = [];

    // 1. Re-create nodes with new IDs and positions
    clipboard.nodes.forEach((node) => {
      const newId = `${nodeId++}`;
      idMap.set(node.id, newId);
      
      newNodes.push({
        ...node,
        id: newId,
        selected: true, // Select the new pasted nodes
        position: {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY,
        },
        data: { ...node.data } // Deep copy data
      });
    });

    // 2. Re-create edges using new node IDs
    clipboard.edges.forEach((edge) => {
      const newSource = idMap.get(edge.source);
      const newTarget = idMap.get(edge.target);
      // Only paste edge if both source and target were copied
      if (newSource && newTarget) {
        newEdges.push({
          ...edge,
          id: `e-${newSource}-${newTarget}-${Date.now()}`, // Unique Edge ID
          source: newSource,
          target: newTarget,
          selected: true
        });
      }
    });

    // Deselect existing nodes so only pasted ones are selected
    const deselectedNodes = nodes.map(n => ({ ...n, selected: false }));
    const deselectedEdges = edges.map(e => ({ ...e, selected: false }));

    setNodes([...deselectedNodes, ...newNodes]);
    setEdges([...deselectedEdges, ...newEdges]);

  }, [clipboard, nodes, edges, rfInstance, takeSnapshot]);


  // --- KEYBOARD SHORTCUTS (Undo/Redo + Copy/Paste) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
      if (isInput) return;

      const isCtrl = e.metaKey || e.ctrlKey;

      // Undo (Ctrl+Z)
      if (isCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo(nodes, edges, setNodes, setEdges);
      }
      // Redo (Ctrl+Y or Ctrl+Shift+Z)
      if ((isCtrl && e.key === 'y') || (isCtrl && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo(nodes, edges, setNodes, setEdges);
      }
      // Copy (Ctrl+C)
      if (isCtrl && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      }
      // Paste (Ctrl+V)
      if (isCtrl && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, undo, redo, handleCopy, handlePaste]);


  // ... (Initial Load, Load Map, Create Map, Delete Map, Auto-Save) ...
  useEffect(() => { fetchMaps(); }, []);
  const fetchMaps = async () => { 
    try { setIsLoading(true); const response = await apiClient.get('/map/'); const mapList = response.data; setMaps(mapList);
    if (mapList.length > 0) await loadMap(mapList[0].id); else await createMap("My First Map"); } 
    catch (error) { console.error("Failed to fetch maps:", error); setIsLoading(false); }
  };
  const loadMap = async (id) => { 
    isLoaded.current = false; setIsLoading(true);
    try { const response = await apiClient.get(`/map/${id}`); const mapData = response.data;
    setNodes(mapData.nodes || []); setEdges(mapData.edges || []); setCurrentMapId(id);
    if (mapData.nodes && mapData.nodes.length > 0) { const maxId = Math.max(0, ...mapData.nodes.map(n => parseInt(n.id, 10) || 0)); nodeId = maxId + 100; }
    } catch (error) { console.error("Error loading map:", error); } 
    finally { setIsLoading(false); setTimeout(() => { isLoaded.current = true; if(nodes.length>0) rfInstance.fitView(); }, 500); }
  };
  const createMap = async (title) => { 
    try { setIsLoading(true); const response = await apiClient.post('/map/', { title }); const newMap = response.data;
    setMaps(prev => [...prev, {id: newMap.id, title: newMap.title}]); await loadMap(newMap.id); } 
    catch(e) { console.error(e); setIsLoading(false); }
  };
  const deleteMap = async (id) => { 
    if(!window.confirm("Delete this map?")) return;
    try { await apiClient.delete(`/map/${id}`); const rem = maps.filter(m=>m.id!==id); setMaps(rem);
    if(currentMapId===id && rem.length>0) loadMap(rem[0].id); else if(rem.length===0) createMap("New Map"); }
    catch(e) { console.error(e); }
  };
  
  // Auto-Save
  useEffect(() => {
    if (!isLoaded.current || !currentMapId) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setIsSaving(true);
    saveTimeout.current = setTimeout(async () => {
      try {
        const currentMap = maps.find(m => m.id === currentMapId);
        const title = currentMap ? currentMap.title : "Untitled";
        const cleanNodes = nodes.map(({ selected, dragging, ...node }) => node);
        await apiClient.put(`/map/${currentMapId}`, { title, nodes: cleanNodes, edges });
      } catch (error) { console.error("Save failed:", error); } 
      finally { setIsSaving(false); }
    }, 1500);
  }, [nodes, edges, currentMapId, maps]);

  // ... (Standard Handlers) ...
  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), [setNodes]);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), [setEdges]);
  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);
  const onNodesDelete = useCallback(() => { takeSnapshot(nodes, edges); }, [nodes, edges, takeSnapshot]);

  const addNode = useCallback((options) => {
    takeSnapshot(nodes, edges);
    const newNode = {
      id: `${nodeId++}`, type: 'mindNode',
      position: options.position || { x: Math.random() * 400 - 200, y: Math.random() * 100 },
      data: { label: options.label || 'Untitled', style: options.style || { backgroundColor: '#2a2a2a', color: '#f0f0f0' }, summary: options.summary || '' },
    };
    setNodes((nds) => nds.concat(newNode));
    return newNode;
  }, [setNodes, nodes, edges, takeSnapshot]);

  // ... (AI Functions) ...
  const generateRoadmap = useCallback(async (sourceNode) => {
    if (!sourceNode || !sourceNode.data || !sourceNode.data.label) return;
    takeSnapshot(nodes, edges); setAiLoadingNode(sourceNode.id);
    try {
      const response = await apiClient.post('/ai/generate-roadmap', { topic: sourceNode.data.label });
      const steps = response.data.steps;
      if (!steps || steps.length === 0) throw new Error("No steps");
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

  // ... (Select Group) ...
  const selectConnectedGroup = useCallback((startNodeId) => {
    const connectedNodeIds = new Set(); const connectedEdgeIds = new Set(); const queue = [startNodeId]; connectedNodeIds.add(startNodeId);
    while (queue.length > 0) {
      const curr = queue.shift();
      const relEdges = edges.filter(e => e.source === curr || e.target === curr);
      relEdges.forEach(edge => {
        connectedEdgeIds.add(edge.id);
        const neighbor = edge.source === curr ? edge.target : edge.source;
        if (!connectedNodeIds.has(neighbor)) { connectedNodeIds.add(neighbor); queue.push(neighbor); }
      });
    }
    setNodes((nds) => nds.map((n) => ({ ...n, selected: connectedNodeIds.has(n.id) })));
    setEdges((eds) => eds.map((e) => ({ ...e, selected: connectedEdgeIds.has(e.id) })));
  }, [nodes, edges, setNodes, setEdges]);

  // ... (Context Menus) ...
  const handlePaneClick = useCallback(() => setContextMenu(null), []);
  const onNodeContextMenu = useCallback((event, node) => { event.preventDefault(); setContextMenu({ id: node.id, node: node, type: 'node', top: event.clientY, left: event.clientX }); }, []);
  const onEdgeContextMenu = useCallback((event, edge) => { event.preventDefault(); setContextMenu({ id: edge.id, type: 'edge', top: event.clientY, left: event.clientX }); }, []);
  const handleMenuAction = useCallback((action, payload) => {
    if (['setNodeColor', 'setEdgeStyle'].includes(action)) takeSnapshot(nodes, edges);
    if (action === 'generateRoadmap') generateRoadmap(contextMenu.node);
    else if (action === 'selectGroup') selectConnectedGroup(contextMenu.id);
    else if (action === 'setNodeColor') setNodes((nds) => nds.map((n) => n.id === contextMenu.id ? { ...n, data: { ...n.data, style: { backgroundColor: payload.background, color: payload.text } } } : n));
    else if (action === 'setEdgeStyle') setEdges((eds) => eds.map((e) => e.id === contextMenu.id ? { ...e, markerEnd: payload === 'directional' ? { type: MarkerType.ArrowClosed } : undefined, style: payload === 'dotted' ? { strokeDasharray: '5 5' } : {} } : e));
    setContextMenu(null);
  }, [contextMenu, setNodes, setEdges, generateRoadmap, takeSnapshot, nodes, edges, selectConnectedGroup]);

  const nodeTypes = useMemo(() => ({ mindNode: (props) => <MindNode {...props} aiLoadingNode={aiLoadingNode} /> }), [aiLoadingNode]);

  // --- RENDER ---
  return (
    <div className={`app-container ${isChatOpen ? 'chat-open' : ''} ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <Sidebar maps={maps} currentMapId={currentMapId} onSelectMap={loadMap} onCreateMap={createMap} onDeleteMap={deleteMap} isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="react-flow-wrapper" ref={reactFlowWrapper}>
        <button onClick={() => addNode({})} className="add-node-btn" style={{ left: isSidebarOpen ? '270px' : '70px', transition: 'left 0.3s' }}>+ Add Note</button>
        <div className="top-right-ui">
          <div className="save-indicator">{isSaving ? "Saving..." : "Saved"}</div>
          <button onClick={() => { setIsChatOpen(!isChatOpen); setTimeout(() => window.dispatchEvent(new Event('resize')), 300); }} className="chat-toggle-btn"><BsChatDots /></button>
        </div>
        {currentMapId ? (
          <ReactFlow
            nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodesDelete={onNodesDelete}
            nodeTypes={nodeTypes} onPaneClick={handlePaneClick} onNodeContextMenu={onNodeContextMenu} onEdgeContextMenu={onEdgeContextMenu}
          >
            <Background />
            <Controls />
          </ReactFlow>
        ) : (
          <div className="loading-screen">
            {isLoading ? ( <div style={{textAlign:'center'}}><p>Loading MindDock...</p><small style={{color:'#666'}}>(First load may take a minute)</small></div> ) : ( <button onClick={fetchMaps} className="add-node-btn" style={{position:'relative', left:0, top:0}}>Retry Loading</button> )}
          </div>
        )}
        {contextMenu && <ContextMenu {...contextMenu} onAction={handleMenuAction} />}
      </div>
      <AIChat nodes={nodes} edges={edges} onAiGeneratedMap={onAiGeneratedMap} isOpen={isChatOpen} toggleChat={() => setIsChatOpen(!isChatOpen)} />
    </div>
  );
}

export default function AppWrapper() { return <ReactFlowProvider><App /></ReactFlowProvider>; }