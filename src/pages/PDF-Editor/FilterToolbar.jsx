import React from 'react';
import { FaArrowLeft, FaAdjust, FaTint, FaSun, FaMoon } from 'react-icons/fa';
import './editor.css';

const FILTER_TOOLS = [
  { icon: <FaAdjust />, label: 'Grayscale', action: 'grayscale' },
  { icon: <FaTint />, label: 'Sepia', action: 'sepia' },
  { icon: <FaSun />, label: 'Brighten', action: 'brighten' },
  { icon: <FaMoon />, label: 'Darken', action: 'darken' },
  { icon: <span style={{fontWeight:600}}>✕</span>, label: 'Remove Filter', action: 'none' }, // Add clear filter option
];

export default function FilterToolbar({ onBack, onToolSelect, activeTool }) {
  return (
    <div className="editor-toolbar">
      <div className={`toolbar-tool${activeTool === 'back' ? ' active-tool' : ''}`} onClick={() => onToolSelect('back')}>
        <div className="tool-icon"><FaArrowLeft /></div>
        <div className="tool-label">Back</div>
      </div>
      {FILTER_TOOLS.map((tool) => (
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
