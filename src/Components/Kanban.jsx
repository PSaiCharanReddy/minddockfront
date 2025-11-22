import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { AiOutlineCheckCircle, AiOutlineClockCircle, AiOutlineStop } from 'react-icons/ai';
import './Kanban.css';

export default function Kanban({ tasks, onUpdateTaskStatus }) {
  
  // Helper to categorize tasks
  const getTasksByStatus = (status) => {
    if (status === 'done') return tasks.filter(t => t.is_completed);
    if (status === 'todo') return tasks.filter(t => !t.is_completed && !t.in_progress); // We'll use a mock 'in_progress' for now
    // For this simple version, 'todo' is everything not done. 
    // To have true 'In Progress', we'd need a status field in DB.
    // Let's simulate 2 columns for now: Pending vs Done.
    return []; 
  };

  const pendingTasks = tasks.filter(t => !t.is_completed);
  const completedTasks = tasks.filter(t => t.is_completed);

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    // Dropped outside
    if (!destination) return;

    // Dropped in same column
    if (source.droppableId === destination.droppableId) return;

    // Find the task
    const taskId = parseInt(draggableId);
    const task = tasks.find(t => t.id === taskId);

    // Determine new status based on column
    const isCompleted = destination.droppableId === 'done';
    
    // Call parent updater
    onUpdateTaskStatus(task, isCompleted);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="kanban-board">
        
        {/* COLUMN 1: TO DO */}
        <Droppable droppableId="todo">
          {(provided) => (
            <div className="kanban-column todo" ref={provided.innerRef} {...provided.droppableProps}>
              <div className="column-header">
                <h3><AiOutlineClockCircle /> To Do</h3>
                <span className="count">{pendingTasks.length}</span>
              </div>
              <div className="column-content">
                {pendingTasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="kanban-card"
                      >
                        <div className="card-title">{task.title}</div>
                        {task.due_date && <div className="card-date">{new Date(task.due_date).toLocaleDateString()}</div>}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            </div>
          )}
        </Droppable>

        {/* COLUMN 2: DONE */}
        <Droppable droppableId="done">
          {(provided) => (
            <div className="kanban-column done" ref={provided.innerRef} {...provided.droppableProps}>
               <div className="column-header">
                <h3><AiOutlineCheckCircle /> Completed</h3>
                <span className="count">{completedTasks.length}</span>
              </div>
              <div className="column-content">
                {completedTasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="kanban-card completed"
                      >
                         <div className="card-title">{task.title}</div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            </div>
          )}
        </Droppable>

      </div>
    </DragDropContext>
  );
}