import React, { useRef, useState, useEffect } from 'react';
import { FaFileUpload, FaEdit, FaTrash, FaDownload, FaMagic, FaArrowsAlt } from 'react-icons/fa';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './editor.css';
import './react-pdf-overrides.css';
import EditToolbar from './EditToolbar';

const TOOLBAR_TOOLS = [
  { icon: <FaEdit />, label: 'Edit' },
  { icon: <FaMagic />, label: 'Enhance' },
  { icon: <FaArrowsAlt />, label: 'Reorder' },
  { icon: <FaTrash />, label: 'Delete' },
  { icon: <FaDownload />, label: 'Download' },
];

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

export default function Editor() {
  const [pdfFile, setPdfFile] = useState(null);
  const [showModal, setShowModal] = useState(true);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [showEditToolbar, setShowEditToolbar] = useState(false);
  const [activeEditTool, setActiveEditTool] = useState(null);
  const fileInputRef = useRef();
  const [textElements, setTextElements] = useState([]);
  const [isAddingText, setIsAddingText] = useState(false);
  const [newTextPosition, setNewTextPosition] = useState({ x: 0, y: 0 });
  const [newTextContent, setNewTextContent] = useState('');
  const [textColor, setTextColor] = useState('#000000'); // New: text color state
  const [highlightElements, setHighlightElements] = useState([]); // highlight state
  const [highlightColor, setHighlightColor] = useState('#ffff00'); // highlight color
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [highlightStart, setHighlightStart] = useState(null);
  const [drawElements, setDrawElements] = useState([]); // draw state
  const [drawColor, setDrawColor] = useState('#ff0000'); // draw color
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDraw, setCurrentDraw] = useState([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [eraseMode, setEraseMode] = useState(false);
  const [pageHistory, setPageHistory] = useState([1]); // Undo/redo stacks for page navigation
  const [redoStack, setRedoStack] = useState([]);
  const pdfContainerRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setShowModal(false);
      setPageNumber(1);
    }
  };

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handlePageChange = (newPage) => {
    if (newPage !== pageNumber && newPage >= 1 && newPage <= numPages) {
      setPageNumber(newPage);
      setPageHistory(prev => [...prev, newPage]);
      setRedoStack([]); // Clear redo stack on new navigation
    }
  };

  const handleUndoPage = () => {
    setPageHistory(prev => {
      if (prev.length > 1) {
        setRedoStack(rstack => [prev[prev.length - 1], ...rstack]);
        const newHistory = prev.slice(0, -1);
        setPageNumber(newHistory[newHistory.length - 1]);
        return newHistory;
      }
      return prev;
    });
  };

  const handleRedoPage = () => {
    setRedoStack(prev => {
      if (prev.length > 0) {
        const nextPage = prev[0];
        setPageNumber(nextPage);
        setPageHistory(hist => [...hist, nextPage]);
        return prev.slice(1);
      }
      return prev;
    });
  };

  const handleEditToolSelect = (tool) => {
    if (tool === 'back') {
      setShowEditToolbar(false);
      setActiveEditTool(null);
      setDeleteMode(false);
      setEraseMode(false);
    } else if (tool === 'undo') {
      handleUndoPage();
      setDeleteMode(false);
      setEraseMode(false);
    } else if (tool === 'redo') {
      handleRedoPage();
      setDeleteMode(false);
      setEraseMode(false);
    } else {
      setActiveEditTool(tool);
      if (tool === 'Delete') {
        setDeleteMode(true);
        setEraseMode(false);
      } else if (tool === 'erase') {
        setEraseMode(true);
        setDeleteMode(false);
      } else {
        setDeleteMode(false);
        setEraseMode(false);
      }
    }
  };

  const handlePageClick = (e) => {
    if (activeEditTool === 'addText' && !isAddingText) {
      if (pdfContainerRef.current) {
        const rect = pdfContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        setNewTextPosition({ x, y });
        setIsAddingText(true);
        setNewTextContent('');
      }
    }
    if (activeEditTool === 'highlight' && !isHighlighting) {
      if (pdfContainerRef.current) {
        const rect = pdfContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setHighlightStart({ x, y });
        setIsHighlighting(true);
      }
    }
  };

  const handleMouseMove = (e) => {
    if (isHighlighting && highlightStart && activeEditTool === 'highlight') {
      if (pdfContainerRef.current) {
        const rect = pdfContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setHighlightStart(prev => ({ ...prev, x2: x, y2: y }));
      }
    }
    if (isDrawing && activeEditTool === 'draw') {
      if (pdfContainerRef.current) {
        const rect = pdfContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCurrentDraw(draw => [...draw, { x, y }]);
      }
    }
  };

  const handleMouseUp = (e) => {
    if (isHighlighting && highlightStart && activeEditTool === 'highlight') {
      if (pdfContainerRef.current) {
        const rect = pdfContainerRef.current.getBoundingClientRect();
        const x2 = e.clientX - rect.left;
        const y2 = e.clientY - rect.top;
        const { x, y } = highlightStart;
        setHighlightElements([...highlightElements, {
          id: Date.now(),
          page: pageNumber,
          x: Math.min(x, x2),
          y: Math.min(y, y2),
          width: Math.abs(x2 - x),
          height: Math.abs(y2 - y),
          color: highlightColor,
        }]);
        setIsHighlighting(false);
        setHighlightStart(null);
      }
    }
    if (isDrawing && activeEditTool === 'draw') {
      setDrawElements([...drawElements, {
        id: Date.now(),
        page: pageNumber,
        points: currentDraw,
        color: drawColor,
      }]);
      setIsDrawing(false);
      setCurrentDraw([]);
    }
  };

  const handleMouseDown = (e) => {
    if (activeEditTool === 'draw') {
      if (pdfContainerRef.current) {
        const rect = pdfContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setIsDrawing(true);
        setCurrentDraw([{ x, y }]);
      }
    }
  };

  const handleTextInputChange = (e) => {
    setNewTextContent(e.target.value);
  };

  const handleTextInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      addTextElement();
    }
  };

  const handleTextInputBlur = () => {
    if (isAddingText) {
      addTextElement();
    }
  };

  const addTextElement = () => {
    if (newTextContent.trim()) {
      const newElement = {
        id: Date.now(),
        type: 'text',
        content: newTextContent,
        position: { ...newTextPosition },
        page: pageNumber,
        color: textColor, // Store color
      };
      
      setTextElements([...textElements, newElement]);
    }
    setIsAddingText(false);
  };

  const handleDeleteText = (id) => {
    setTextElements(textElements.filter(el => el.id !== id));
  };

  const handleDeleteHighlight = (id) => {
    setHighlightElements(highlightElements.filter(el => el.id !== id));
  };

  const handleDeleteDraw = (id) => {
    setDrawElements(drawElements.filter(el => el.id !== id));
  };

  const handlePdfAreaContextMenu = (e) => {
    e.preventDefault();
    setDeleteMode(false);
    setEraseMode(false);
    setActiveEditTool(null);
    setShowEditToolbar(false);
  };

  return (
    <div className="editor-bg">
      {showModal && (
        <div className="glass-modal">
          <div className="modal-content">
            <FaFileUpload className="modal-upload-icon" />
            <h2 className="modal-title">Upload your PDF</h2>
            <p className="modal-desc">Drag & drop or click to select a PDF file</p>
            <button className="modal-upload-btn" onClick={handleUploadClick}>
              Choose PDF
            </button>
            <input
              type="file"
              accept="application/pdf"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
        </div>
      )}

      {!showModal && (
        <>
          <header className="editor-header">
            <span className="editor-title-animated">PDF Editor</span>
          </header>
          <main className="editor-main">
            {pdfFile ? (
              <div 
                className="pdfjs-preview-wrapper" 
                ref={pdfContainerRef} 
                onClick={handlePageClick}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseDown={handleMouseDown}
                onContextMenu={handlePdfAreaContextMenu}
                style={{ position: 'relative', userSelect: activeEditTool === 'highlight' ? 'none' : undefined }}
              >
                {/* Delete mode indicator */}
                {deleteMode && (
                  <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 20, background: '#ffeded', color: '#c00', padding: '6px 12px', borderRadius: 4, fontWeight: 600, boxShadow: '0 1px 4px #0002' }}>
                    Delete Mode: Click an annotation to remove it
                  </div>
                )}
                {/* Erase mode indicator */}
                {eraseMode && (
                  <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 20, background: '#e0f7fa', color: '#00796b', padding: '6px 12px', borderRadius: 4, fontWeight: 600, boxShadow: '0 1px 4px #0002' }}>
                    Erase Mode: Click a text, highlight, drawing, or image to erase it
                  </div>
                )}
                {/* Tool color pickers */}
                {activeEditTool === 'addText' && (
                  <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, background: '#fff', padding: 6, borderRadius: 4, boxShadow: '0 1px 4px #0002' }}>
                    <label style={{ fontSize: 12, marginRight: 6 }}>Text Color:</label>
                    <input
                      type="color"
                      value={textColor}
                      onChange={e => setTextColor(e.target.value)}
                      style={{ verticalAlign: 'middle' }}
                    />
                  </div>
                )}
                {activeEditTool === 'highlight' && (
                  <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, background: '#fff', padding: 6, borderRadius: 4, boxShadow: '0 1px 4px #0002' }}>
                    <label style={{ fontSize: 12, marginRight: 6 }}>Highlight Color:</label>
                    <input
                      type="color"
                      value={highlightColor}
                      onChange={e => setHighlightColor(e.target.value)}
                      style={{ verticalAlign: 'middle' }}
                    />
                  </div>
                )}
                {activeEditTool === 'draw' && (
                  <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, background: '#fff', padding: 6, borderRadius: 4, boxShadow: '0 1px 4px #0002' }}>
                    <label style={{ fontSize: 12, marginRight: 6 }}>Draw Color:</label>
                    <input
                      type="color"
                      value={drawColor}
                      onChange={e => setDrawColor(e.target.value)}
                      style={{ verticalAlign: 'middle' }}
                    />
                  </div>
                )}
                <Document
                  file={pdfFile}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={<div className="pdf-placeholder">Loading PDF...</div>}
                  className="pdfjs-document"
                >
                  <Page pageNumber={pageNumber} className="pdfjs-page" />
                </Document>

                {/* Render highlights */}
                {highlightElements.filter(el => el.page === pageNumber).map(el => (
                  <div
                    key={el.id}
                    style={{
                      position: 'absolute',
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                      background: el.color,
                      opacity: 0.4,
                      pointerEvents: (deleteMode || eraseMode) ? 'auto' : 'none',
                      borderRadius: 2,
                      cursor: (deleteMode || eraseMode) ? 'pointer' : 'default',
                      border: deleteMode ? '2px solid #c00' : eraseMode ? '2px solid #00796b' : 'none',
                      boxSizing: 'border-box',
                    }}
                    onClick={
                      deleteMode || eraseMode
                        ? () => handleDeleteHighlight(el.id)
                        : undefined
                    }
                    title={
                      deleteMode
                        ? 'Click to delete highlight'
                        : eraseMode
                          ? 'Click to erase highlight'
                          : ''
                    }
                  />
                ))}
                {/* Render highlight preview while drawing */}
                {isHighlighting && highlightStart && highlightStart.x2 !== undefined && (
                  <div
                    style={{
                      position: 'absolute',
                      left: Math.min(highlightStart.x, highlightStart.x2),
                      top: Math.min(highlightStart.y, highlightStart.y2),
                      width: Math.abs(highlightStart.x2 - highlightStart.x),
                      height: Math.abs(highlightStart.y2 - highlightStart.y),
                      background: highlightColor,
                      opacity: 0.3,
                      pointerEvents: 'none',
                      borderRadius: 2,
                    }}
                  />
                )}

                {/* Render drawings */}
                {drawElements.filter(el => el.page === pageNumber).map(el => (
                  <svg
                    key={el.id}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: (deleteMode || eraseMode) ? 'auto' : 'none',
                      cursor: (deleteMode || eraseMode) ? 'pointer' : 'default',
                      zIndex: 2,
                    }}
                    onClick={
                      deleteMode || eraseMode
                        ? () => handleDeleteDraw(el.id)
                        : undefined
                    }
                    title={
                      deleteMode
                        ? 'Click to delete drawing'
                        : eraseMode
                          ? 'Click to erase drawing'
                          : ''
                    }
                  >
                    <polyline
                      points={el.points.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke={el.color}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {(deleteMode || eraseMode) && (
                      <rect x="0" y="0" width="100%" height="100%" fill="transparent" />
                    )}
                  </svg>
                ))}
                {/* Render current drawing */}
                {isDrawing && currentDraw.length > 1 && (
                  <svg
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                    }}
                  >
                    <polyline
                      points={currentDraw.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke={drawColor}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </svg>
                )}

                {/* Render text elements */}
                {textElements.filter(el => el.page === pageNumber).map(element => (
                  <div 
                    key={element.id}
                    style={{
                      position: 'absolute',
                      left: `${element.position.x}px`,
                      top: `${element.position.y}px`,
                      color: element.color || '#000',
                      pointerEvents: (deleteMode || eraseMode) ? 'auto' : 'none',
                      background: 'transparent',
                      fontSize: 16,
                      cursor: (deleteMode || eraseMode) ? 'pointer' : 'default',
                      border: deleteMode ? '1px dashed #c00' : eraseMode ? '1px dashed #00796b' : 'none',
                    }}
                    onClick={
                      deleteMode || eraseMode
                        ? () => handleDeleteText(element.id)
                        : undefined
                    }
                    title={
                      deleteMode
                        ? 'Click to delete text'
                        : eraseMode
                          ? 'Click to erase text'
                          : ''
                    }
                  >
                    {element.content}
                  </div>
                ))}
                {isAddingText && (
                  <input
                    type="text"
                    autoFocus
                    style={{
                      position: 'absolute',
                      left: `${newTextPosition.x}px`,
                      top: `${newTextPosition.y}px`,
                      minWidth: '100px',
                      color: textColor,
                    }}
                    value={newTextContent}
                    onChange={handleTextInputChange}
                    onKeyDown={handleTextInputKeyDown}
                    onBlur={handleTextInputBlur}
                  />
                )}

                <div className="pdfjs-controls">
                  <button
                    onClick={() => handlePageChange(Math.max(1, pageNumber - 1))}
                    disabled={pageNumber <= 1}
                  >Prev</button>
                  <span>Page {pageNumber} of {numPages}</span>
                  <button
                    onClick={() => handlePageChange(Math.min(numPages, pageNumber + 1))}
                    disabled={pageNumber >= numPages}
                  >Next</button>
                </div>
              </div>
            ) : (
              <div className="pdf-placeholder">PDF Preview/Editor Area</div>
            )}
          </main>
          {showEditToolbar ? (
            <EditToolbar
              onBack={() => setShowEditToolbar(false)}
              onToolSelect={handleEditToolSelect}
              activeTool={activeEditTool}
              undoDisabled={pageHistory.length <= 1}
              redoDisabled={redoStack.length === 0}
            />
          ) : (
            <footer className="editor-toolbar">
              {TOOLBAR_TOOLS.map((tool, idx) => (
                <div
                  className="toolbar-tool"
                  key={tool.label}
                  onClick={() => tool.label === 'Edit' && setShowEditToolbar(true)}
                >
                  <div className="tool-icon">{tool.icon}</div>
                  <div className="tool-label">{tool.label}</div>
                </div>
              ))}
            </footer>
          )}
        </>
      )}
    </div>
  );
}
