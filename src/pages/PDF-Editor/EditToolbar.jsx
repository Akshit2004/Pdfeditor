import React from 'react';
import { FaArrowLeft, FaFont, FaHighlighter, FaPen, FaEraser } from 'react-icons/fa';
import './editor.css';

const EDIT_TOOLS = [
  { icon: <FaFont />, label: 'Add Text', action: 'addText' },
  { icon: <FaHighlighter />, label: 'Highlight', action: 'highlight' },
  { icon: <FaEraser />, label: 'Erase', action: 'erase' },
  { icon: <FaArrowLeft style={{transform: 'rotate(-90deg)'}} />, label: 'Reorder', action: 'reorder' }, // Reorder tool
];

export default function EditToolbar({ onBack, onToolSelect, activeTool }) {
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
    </div>
  );
}
