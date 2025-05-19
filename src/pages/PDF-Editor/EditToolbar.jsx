import React from 'react';
import { FaArrowLeft, FaFont, FaHighlighter, FaPen, FaEraser, FaUndo, FaRedo } from 'react-icons/fa';
import './editor.css';

const EDIT_TOOLS = [
  { icon: <FaFont />, label: 'Add Text', action: 'addText' },
  { icon: <FaHighlighter />, label: 'Highlight', action: 'highlight' },
  { icon: <FaPen />, label: 'Draw', action: 'draw' },
  { icon: <FaEraser />, label: 'Erase', action: 'erase' },
];

export default function EditToolbar({ onBack, onToolSelect, activeTool, undoDisabled, redoDisabled }) {
  return (
    <div className="editor-toolbar">
      <div className={`toolbar-tool${activeTool === 'back' ? ' active-tool' : ''}`} onClick={() => onToolSelect('back')}>
        <div className="tool-icon"><FaArrowLeft /></div>
        <div className="tool-label">Back</div>
      </div>
      {EDIT_TOOLS.map((tool) => (
        <div
          className={`toolbar-tool${activeTool === tool.action ? ' active-tool' : ''}`}
          key={tool.label}
          onClick={() => onToolSelect(tool.action)}
        >
          <div className="tool-icon">{tool.icon}</div>
          <div className="tool-label">{tool.label}</div>
        </div>
      ))}
      <div
        className={`toolbar-tool${activeTool === 'undo' ? ' active-tool' : ''}${undoDisabled ? ' disabled-tool' : ''}`}
        onClick={() => !undoDisabled && onToolSelect('undo')}
        style={{ pointerEvents: undoDisabled ? 'none' : undefined, opacity: undoDisabled ? 0.5 : 1 }}
      >
        <div className="tool-icon"><FaUndo /></div>
        <div className="tool-label">Undo</div>
      </div>
      <div
        className={`toolbar-tool${activeTool === 'redo' ? ' active-tool' : ''}${redoDisabled ? ' disabled-tool' : ''}`}
        onClick={() => !redoDisabled && onToolSelect('redo')}
        style={{ pointerEvents: redoDisabled ? 'none' : undefined, opacity: redoDisabled ? 0.5 : 1 }}
      >
        <div className="tool-icon"><FaRedo /></div>
        <div className="tool-label">Redo</div>
      </div>
    </div>
  );
}
