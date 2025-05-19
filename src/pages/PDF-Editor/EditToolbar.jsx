import React from 'react';
import { FaArrowLeft, FaFont, FaHighlighter, FaPen, FaEraser, FaImage, FaArrowsAlt, FaUndo, FaRedo } from 'react-icons/fa';
import './editor.css';

const EDIT_TOOLS = [
  { icon: <FaFont />, label: 'Add Text' },
  { icon: <FaHighlighter />, label: 'Highlight' },
  { icon: <FaPen />, label: 'Draw' },
  { icon: <FaEraser />, label: 'Erase' },
  { icon: <FaImage />, label: 'Add Image' },
  { icon: <FaArrowsAlt />, label: 'Move' },
  { icon: <FaUndo />, label: 'Undo' },
  { icon: <FaRedo />, label: 'Redo' },
];

export default function EditToolbar({ onBack }) {
  return (
    <div className="editor-toolbar">
      <div className="toolbar-tool" onClick={onBack}>
        <div className="tool-icon"><FaArrowLeft /></div>
        <div className="tool-label">Back</div>
      </div>
      {EDIT_TOOLS.map((tool) => (
        <div className="toolbar-tool" key={tool.label}>
          <div className="tool-icon">{tool.icon}</div>
          <div className="tool-label">{tool.label}</div>
        </div>
      ))}
    </div>
  );
}
