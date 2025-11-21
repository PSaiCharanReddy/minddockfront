import { useState, useCallback } from 'react';

export const useUndoRedo = () => {
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  // Call this BEFORE making a change to save the current state
  const takeSnapshot = useCallback((nodes, edges) => {
    setPast((prev) => {
      // Limit history to last 20 steps to save memory
      const newPast = [...prev, { nodes, edges }];
      if (newPast.length > 20) newPast.shift(); 
      return newPast;
    });
    setFuture([]); // New action clears the "redo" stack
  }, []);

  const undo = useCallback((currentNodes, currentEdges, setNodes, setEdges) => {
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    // Push current state to future so we can Redo if needed
    setFuture((prev) => [{ nodes: currentNodes, edges: currentEdges }, ...prev]);

    setNodes(previous.nodes);
    setEdges(previous.edges);
    setPast(newPast);
  }, [past]);

  const redo = useCallback((currentNodes, currentEdges, setNodes, setEdges) => {
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    // Push current state to past
    setPast((prev) => [...prev, { nodes: currentNodes, edges: currentEdges }]);

    setNodes(next.nodes);
    setEdges(next.edges);
    setFuture(newFuture);
  }, [future]);

  return { 
    takeSnapshot, 
    undo, 
    redo, 
    canUndo: past.length > 0, 
    canRedo: future.length > 0 
  };
};