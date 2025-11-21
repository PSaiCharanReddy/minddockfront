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
import { useUndoRedo } from './hooks/useUndoRedo'; // Import the Undo/Redo hook

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
  
  // --- Refs & Hooks ---
  const saveTimeout = useRef(null);
  const isLoaded = useRef(false);
  const reactFlowWrapper = useRef(null);
  const rfInstance = useReactFlow();
  
  // --- Undo/Redo Hook ---
  const { takeSnapshot, undo, redo } = useUndoRedo();

  // --- Keyboard Shortcuts for Undo/Redo ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo(nodes, edges, setNodes, setEdges);
        } else {
          undo(nodes, edges, setNodes, setEdges);
        }
        e.preventDefault();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') { // Windows Redo
        redo(nodes, edges, setNodes, setEdges);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, undo, redo]);

  // --- 1. Initial Load: Fetch List of Maps ---
  useEffect(() => {
    fetchMaps();
  }, []);

  const fetchMaps = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/map/');
      const mapList = response.data;
      setMaps(mapList);

      if (mapList.length > 0) {
        await loadMap(mapList[0].id);
      } else {
        await createMap("My First Map");
      }
    } catch (error) {
      console.error("Failed to fetch maps:", error);
      setIsLoading(false); 
    }
  };

  // --- 2. Load a Specific Map ---
  const loadMap = async (id) => {
    isLoaded.current = false; 
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/map/${id}`);
      const mapData = response.data;
      
      setNodes(mapData.nodes || []);
      setEdges(mapData.edges || []);
      setCurrentMapId(id);
      
      if (mapData.nodes && mapData.nodes.length > 0) {
         const maxId = Math.max(0, ...mapData.nodes.map(n => parseInt(n.id, 10) || 0));
         nodeId = maxId + 100;
      }
    } catch (error) {
      console.error("Failed to load map data:", error);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isLoaded.current = true;
        if (nodes.length > 0) rfInstance.fitView();
      }, 500);
    }
  };

  // --- 3. Create New Map ---
  const createMap = async (title) => {
    try {
      setIsLoading(true);
      const response = await apiClient.post('/map/', { title });
      const newMap = response.data;
      setMaps((prev) => [...prev, { id: newMap.id, title: newMap.title }]);
      await loadMap(newMap.id);
    } catch (error) {
      console.error("Failed to create map:", error);
      setIsLoading(false);
    }
  };

  // --- 4. Delete Map ---
  const deleteMap = async (id) => {
    if (!window.confirm("Are you sure you want to delete this map?")) return;
    try {
      await apiClient.delete(`/map/${id}`);
      const remainingMaps = maps.filter(m => m.id !== id);
      setMaps(remainingMaps);
      
      if (currentMapId === id && remainingMaps.length > 0) {
        loadMap(remainingMaps[0].id);
      } else if (remainingMaps.length === 0) {
        createMap("New Map");
      }
    } catch (error) {
      console.error("Failed to delete map:", error);
    }
  };

  // --- Auto-Save ---
  useEffect(() => {
    if (!isLoaded.current || !currentMapId) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    
    setIsSaving(true);
    
    saveTimeout.current = setTimeout(async () => {
      try {
        const currentMap = maps.find(m => m.id === currentMapId);
        const title = currentMap ? currentMap.title : "Untitled";
        const cleanNodes = nodes.map(({ selected, dragging, ...node }) => node);
        
        await apiClient.put(`/map/${currentMapId}`, {
          title: title,
          nodes: cleanNodes,
          edges: edges,
        });
      } catch (error) {
        console.error("Failed to save map:", error);
      } finally {
        setIsSaving(false);
      }
    }, 1500);
  }, [nodes, edges, currentMapId, maps]);

  // ... Standard Handlers ...
  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), [setNodes]);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), [setEdges]);
  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);
  
  // --- Snapshot for Deletions (Backspace key) ---
  const onNodesDelete = useCallback(() => {
    takeSnapshot(nodes, edges);
  }, [nodes, edges, takeSnapshot]);

  const addNode = useCallback((options) => {
    takeSnapshot(nodes, edges); // Snapshot before adding
    const newNode = {
      id: `${nodeId++}`,
      type: 'mindNode',
      position: options.position || { x: Math.random() * 400 - 200, y: Math.random() * 100 },
      data: { label: options.label || 'Untitled', style: options.style || { backgroundColor: '#2a2a2a', color: '#f0f0f0' }, summary: options.summary || '' },
    };
    setNodes((nds) => nds.concat(newNode));
    return newNode;
  }, [setNodes, nodes, edges, takeSnapshot]);

  const generateRoadmap = useCallback(async (sourceNode) => {
    if (!sourceNode || !sourceNode.data || !sourceNode.data.label) return;
    
    takeSnapshot(nodes, edges); // Snapshot before AI generation
    setAiLoadingNode(sourceNode.id);
    
    try {
      const response = await apiClient.post('/ai/generate-roadmap', { topic: sourceNode.data.label });
      const steps = response.data.steps;
      if (!steps || steps.length === 0) throw new Error("No steps returned");
      
      let newNodes = [];
      let newEdges = [];
      let lastNodeId = sourceNode.id;
      
      steps.forEach((step, index) => {
        const newNodeId = `${nodeId++}`;
        newNodes.push({
          id: newNodeId,
          type: 'mindNode',
          position: { x: sourceNode.position.x, y: sourceNode.position.y + (index * 90) + 120 },
          data: { label: step, style: { backgroundColor: '#2a2a2a', color: '#f0f0f0' }, summary: '' }
        });
        newEdges.push({ id: `e-${lastNodeId}-${newNodeId}`, source: lastNodeId, target: newNodeId, markerEnd: { type: MarkerType.ArrowClosed } });
        lastNodeId = newNodeId;
      });
      setNodes((nds) => nds.concat(newNodes));
      setEdges((eds) => eds.concat(newEdges));
      setTimeout(() => rfInstance.fitView({ duration: 500, nodes: [sourceNode, ...newNodes] }), 100);
    } catch (error) {
      console.error(error);
    } finally {
      setAiLoadingNode(null);
    }
  }, [rfInstance, setNodes, setEdges, nodes, edges, takeSnapshot]);

  const onAiGeneratedMap = useCallback((newMapData) => {
    takeSnapshot(nodes, edges); // Snapshot before AI chat adds map
    
    const { x, y, zoom } = rfInstance.getViewport();
    // Default to center if viewport isn't ready
    const centerX = -x / zoom + (window.innerWidth / 2) / zoom || 0;
    const centerY = -y / zoom + (window.innerHeight / 2) / zoom || 0;
    
    const idMap = new Map();
    let newNodes = [];
    let newEdges = [];

    newMapData.nodes.forEach(node => {
      const newId = `${nodeId++}`;
      idMap.set(node.id, newId);
      newNodes.push({
        ...node,
        id: newId,
        position: {
          x: node.position.x + centerX,
          y: node.position.y + centerY
        }
      });
    });
    newMapData.edges.forEach(edge => {
      const src = idMap.get(edge.source);
      const tgt = idMap.get(edge.target);
      if (src && tgt) {
        newEdges.push({
          ...edge,
          id: `e-${src}-${tgt}`,
          source: src,
          target: tgt
        });
      }
    });

    setNodes((nds) => [...nds, ...newNodes]);
    setEdges((eds) => [...eds, ...newEdges]);
    
    setTimeout(() => rfInstance.fitView({ duration: 500, nodes: newNodes }), 100);
  }, [rfInstance, setNodes, setEdges, nodes, edges, takeSnapshot]);

  // --- NEW: Select Connected Group Logic ---
  const selectConnectedGroup = useCallback((startNodeId) => {
    const connectedNodeIds = new Set();
    const connectedEdgeIds = new Set();
    const queue = [startNodeId];
    
    connectedNodeIds.add(startNodeId);

    // BFS Algorithm
    while (queue.length > 0) {
      const currentNodeId = queue.shift();

      const relatedEdges = edges.filter(
        (e) => e.source === currentNodeId || e.target === currentNodeId
      );

      relatedEdges.forEach((edge) => {
        connectedEdgeIds.add(edge.id);
        const neighborId = edge.source === currentNodeId ? edge.target : edge.source;
        if (!connectedNodeIds.has(neighborId)) {
          connectedNodeIds.add(neighborId);
          queue.push(neighborId);
        }
      });
    }

    setNodes((nds) => nds.map((n) => ({ ...n, selected: connectedNodeIds.has(n.id) })));
    setEdges((eds) => eds.map((e) => ({ ...e, selected: connectedEdgeIds.has(e.id) })));

  }, [nodes, edges, setNodes, setEdges]);

  const handlePaneClick = useCallback(() => setContextMenu(null), []);
  const onNodeContextMenu = useCallback((event, node) => { event.preventDefault(); setContextMenu({ id: node.id, node: node, type: 'node', top: event.clientY, left: event.clientX }); }, []);
  const onEdgeContextMenu = useCallback((event, edge) => { event.preventDefault(); setContextMenu({ id: edge.id, type: 'edge', top: event.clientY, left: event.clientX }); }, []);
  
  const handleMenuAction = useCallback((action, payload) => {
    if (action === 'setNodeColor' || action === 'setEdgeStyle') {
      takeSnapshot(nodes, edges);
    }

    if (action === 'generateRoadmap') generateRoadmap(contextMenu.node);
    else if (action === 'selectGroup') selectConnectedGroup(contextMenu.id); // <-- Call new group select
    else if (action === 'setNodeColor') setNodes((nds) => nds.map((n) => n.id === contextMenu.id ? { ...n, data: { ...n.data, style: { backgroundColor: payload.background, color: payload.text } } } : n));
    else if (action === 'setEdgeStyle') setEdges((eds) => eds.map((e) => e.id === contextMenu.id ? { ...e, markerEnd: payload === 'directional' ? { type: MarkerType.ArrowClosed } : undefined, style: payload === 'dotted' ? { strokeDasharray: '5 5' } : {} } : e));
    setContextMenu(null);
  }, [contextMenu, setNodes, setEdges, generateRoadmap, takeSnapshot, nodes, edges, selectConnectedGroup]);

  const nodeTypes = useMemo(() => ({ mindNode: (props) => <MindNode {...props} aiLoadingNode={aiLoadingNode} /> }), [aiLoadingNode]);

  // --- RENDER ---
  return (
    <div className={`app-container ${isChatOpen ? 'chat-open' : ''} ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      
      <Sidebar 
        maps={maps}
        currentMapId={currentMapId}
        onSelectMap={loadMap}
        onCreateMap={createMap}
        onDeleteMap={deleteMap}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="react-flow-wrapper" ref={reactFlowWrapper}>
        <button onClick={() => addNode({})} className="add-node-btn" style={{ left: isSidebarOpen ? '270px' : '70px', transition: 'left 0.3s' }}>
          + Add Note
        </button>
        
        <div className="top-right-ui">
          <div className="save-indicator">
            {isSaving ? "Saving..." : "Saved"}
          </div>
          <button onClick={() => { setIsChatOpen(!isChatOpen); setTimeout(() => window.dispatchEvent(new Event('resize')), 300); }} className="chat-toggle-btn">
            <BsChatDots />
          </button>
        </div>

        {currentMapId ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodesDelete={onNodesDelete} // Capture deletions for undo
            nodeTypes={nodeTypes}
            onPaneClick={handlePaneClick}
            onNodeContextMenu={onNodeContextMenu}
            onEdgeContextMenu={onEdgeContextMenu}
          >
            <Background />
            <Controls />
          </ReactFlow>
        ) : (
          <div className="loading-screen">
            {isLoading ? (
              <div style={{textAlign:'center'}}>
                <p>Loading MindDock...</p>
                <small style={{color: '#666'}}>(First load may take a minute)</small>
              </div>
            ) : (
              <button onClick={fetchMaps} className="add-node-btn" style={{position:'relative', left:0, top:0}}>
                Retry Loading
              </button>
            )}
          </div>
        )}

        {contextMenu && <ContextMenu {...contextMenu} onAction={handleMenuAction} />}
      </div>
      
      <AIChat 
        nodes={nodes} 
        edges={edges} 
        onAiGeneratedMap={onAiGeneratedMap} 
        isOpen={isChatOpen} 
        toggleChat={() => setIsChatOpen(!isChatOpen)} 
      />
    </div>
  );
}

export default function AppWrapper() {
  return <ReactFlowProvider><App /></ReactFlowProvider>;
}