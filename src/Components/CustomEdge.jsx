import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useReactFlow,
} from '@xyflow/react';

// 'id', 'sourceX', 'sourceY', 'targetX', 'targetY', 'data' are passed by React Flow
export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}) {
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const { setEdges } = useReactFlow();

  const onDelete = () => {
    // This is a helper from React Flow to remove the edge
    setEdges((eds) => eds.filter((e) => e.id !== id));
  };

  return (
    <>
      {/* This renders the actual SVG line */}
      <BaseEdge id={id} path={edgePath} />

      {/* This renders our custom button in the middle of the line */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button className="edge-delete-btn" onClick={onDelete}>
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}