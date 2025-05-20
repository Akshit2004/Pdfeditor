import React, { useRef, useState, useEffect } from 'react';
import { FaFileUpload, FaEdit, FaTrash, FaDownload, FaMagic, FaSyncAlt } from 'react-icons/fa';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './editor.css';
import './react-pdf-overrides.css';
import EditToolbar from './EditToolbar';

const TOOLBAR_TOOLS = [
  { icon: <FaEdit />, label: 'Edit' },
  { icon: <FaMagic />, label: 'Enhance' },
  { icon: <FaTrash />, label: 'Delete' },
  { icon: <FaDownload />, label: 'Download' },
  { icon: <FaSyncAlt />, label: 'Rotate' }, // Add Rotate tool
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
  const [deleteMode, setDeleteMode] = useState(false);
  const [eraseMode, setEraseMode] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [movingElement, setMovingElement] = useState(null);
  const [moveOffset, setMoveOffset] = useState({ x: 0, y: 0 });
  const pdfContainerRef = useRef(null);
  const [enhanceStatus, setEnhanceStatus] = useState('');

  // Download PDF functionality with styled popup menu
  const [showDownloadPopup, setShowDownloadPopup] = useState(false);
  const [downloadFileName, setDownloadFileName] = useState('');

  const [showReorderModal, setShowReorderModal] = useState(false);
  const [pageOrder, setPageOrder] = useState([]); // Array of page indices
  const [pagePreviews, setPagePreviews] = useState([]); // For reorder modal
  const [rotations, setRotations] = useState({}); // {pageIdx: rotation}

  const handleDownloadPdf = () => {
    if (!pdfFile) return;
    setDownloadFileName(pdfFile.name || 'document.pdf');
    setShowDownloadPopup(true);
  };

  const handleDownloadConfirm = () => {
    let fileName = downloadFileName.trim();
    if (!fileName) return;
    if (!fileName.toLowerCase().endsWith('.pdf')) fileName += '.pdf';
    const url = URL.createObjectURL(pdfFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    setShowDownloadPopup(false);
  };

  const handleDownloadCancel = () => {
    setShowDownloadPopup(false);
  };

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
    }
  };

  const handleEditToolSelect = (tool) => {
    if (tool === 'back') {
      setShowEditToolbar(false);
      setActiveEditTool(null);
      setDeleteMode(false);
      setEraseMode(false);
      setMoveMode(false);
      setMovingElement(null);
      setShowReorderModal(false);
    } else {
      setActiveEditTool(tool);
      if (tool === 'reorder') {
        // Open reorder modal and initialize page order
        setShowReorderModal(true);
        setPageOrder(Array.from({ length: numPages }, (_, i) => i));
      } else {
        setShowReorderModal(false);
        if (tool === 'Delete') {
          setDeleteMode(true);
          setEraseMode(false);
          setMoveMode(false);
          setMovingElement(null);
        } else if (tool === 'erase') {
          setEraseMode(true);
          setDeleteMode(false);
          setMoveMode(false);
          setMovingElement(null);
        } else if (tool === 'Move') {
          setMoveMode(true);
          setDeleteMode(false);
          setEraseMode(false);
          setMovingElement(null);
        } else {
          setDeleteMode(false);
          setEraseMode(false);
          setMoveMode(false);
          setMovingElement(null);
        }
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
    if (moveMode && movingElement) {
      setMovingElement(null);
    }
  };

  const handleMouseDown = (e) => {
    // Draw tool removed: do nothing
  };

  const handleElementMouseDown = (type, id, e) => {
    if (!moveMode) return;
    e.stopPropagation();
    let el;
    if (type === 'text') el = textElements.find(t => t.id === id);
    if (type === 'highlight') el = highlightElements.find(h => h.id === id);
    if (!el) return;
    let pos;
    if (type === 'text') pos = el.position;
    if (type === 'highlight') pos = { x: el.x, y: el.y };
    setMovingElement({
      type,
      id,
      start: pos,
    });
    setMoveOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    });
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

  const handlePdfAreaContextMenu = (e) => {
    e.preventDefault();
    setDeleteMode(false);
    setEraseMode(false);
    setActiveEditTool(null);
    setShowEditToolbar(false);
  };

  // Delete mode: delete the current page from the PDF
  const handleDeletePage = () => {
    if (!pdfFile || !numPages || numPages <= 1) return;
    // Read the PDF as ArrayBuffer and use PDF-lib to remove the page
    const reader = new FileReader();
    reader.onload = async function(e) {
      const { PDFDocument } = await import('pdf-lib');
      const arrayBuffer = e.target.result;
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      pdfDoc.removePage(pageNumber - 1);
      const newPdfBytes = await pdfDoc.save();
      const newFile = new File([newPdfBytes], pdfFile.name || 'document.pdf', { type: 'application/pdf' });
      setPdfFile(newFile);
      setNumPages(numPages - 1);
      setPageNumber(Math.max(1, Math.min(pageNumber, numPages - 1)));
      // Optionally clear annotations for deleted page
      setTextElements(textElements.filter(el => el.page !== pageNumber));
      setHighlightElements(highlightElements.filter(el => el.page !== pageNumber));
    };
    reader.readAsArrayBuffer(pdfFile);
  };

  // Enhance PDF: Compress PDF (reduce file size while maintaining quality)
  const handleEnhancePdf = () => {
    if (!pdfFile) return;
    setEnhanceStatus('Processing...');
    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const { PDFDocument } = await import('pdf-lib');
        const arrayBuffer = e.target.result;
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        // Optionally: remove unused objects, compress streams
        pdfDoc.setTitle('Enhanced PDF');
        // Save with compression (pdf-lib compresses by default)
        const newPdfBytes = await pdfDoc.save({ useObjectStreams: true });
        const newFile = new File([newPdfBytes], pdfFile.name.replace(/\.pdf$/i, '') + '-enhanced.pdf', { type: 'application/pdf' });
        setPdfFile(newFile);
        setEnhanceStatus('PDF enhanced and compressed!');
        setTimeout(() => setEnhanceStatus(''), 2000);
      } catch (err) {
        setEnhanceStatus('Enhancement failed.');
        setTimeout(() => setEnhanceStatus(''), 2000);
      }
    };
    reader.readAsArrayBuffer(pdfFile);
  };

  // Add handler for toolbar rotate button
  const handleRotateCurrentPage = () => {
    setRotations(prev => ({
      ...prev,
      [pageNumber - 1]: ((prev[pageNumber - 1] || 0) + 90) % 360
    }));
  };

  // Generate page previews for reorder modal
  useEffect(() => {
    if (!showReorderModal || !pdfFile || !numPages) return;
    const loadPreviews = async () => {
      const previews = [];
      for (let i = 1; i <= numPages; i++) {
        previews.push(i);
      }
      setPagePreviews(previews);
    };
    loadPreviews();
  }, [showReorderModal, pdfFile, numPages]);

  const handleRotatePage = (pageIdx) => {
    setRotations(prev => ({
      ...prev,
      [pageIdx]: ((prev[pageIdx] || 0) + 90) % 360
    }));
  };

  // Reorder modal drag-and-drop handlers
  const handleDragStart = (idx) => (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', idx);
  };
  const handleDrop = (idx) => (e) => {
    e.preventDefault();
    const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (fromIdx === idx) return;
    const newOrder = [...pageOrder];
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(idx, 0, moved);
    setPageOrder(newOrder);
  };
  const handleDragOver = (e) => e.preventDefault();

  const handleReorderConfirm = async () => {
    if (!pdfFile || pageOrder.length !== numPages) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
      const { PDFDocument } = await import('pdf-lib');
      const arrayBuffer = e.target.result;
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();
      for (const idx of pageOrder) {
        const [copied] = await newPdf.copyPages(pdfDoc, [idx]);
        if (rotations[idx]) copied.setRotation(rotations[idx]);
        newPdf.addPage(copied);
      }
      const newPdfBytes = await newPdf.save();
      const newFile = new File([newPdfBytes], pdfFile.name || 'document.pdf', { type: 'application/pdf' });
      setPdfFile(newFile);
      setShowReorderModal(false);
      setPageNumber(1);
      setRotations({});
    };
    reader.readAsArrayBuffer(pdfFile);
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
              <>
                <div 
                  className="pdfjs-preview-wrapper" 
                  ref={pdfContainerRef} 
                  onClick={handlePageClick}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseDown={handleMouseDown}
                  onContextMenu={handlePdfAreaContextMenu}
                  style={{ 
                    position: 'relative', 
                    userSelect: activeEditTool === 'highlight' ? 'none' : undefined,
                  }}
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
                  {/* Move mode indicator */}
                  {moveMode && (
                    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 20, background: '#e0e7ff', color: '#3730a3', padding: '6px 12px', borderRadius: 4, fontWeight: 600, boxShadow: '0 1px 4px #0002' }}>
                      Move Mode: Drag and drop text, highlight, or drawing
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
                  <Document
                    file={pdfFile}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={<div className="pdf-placeholder">Loading PDF...</div>}
                    className="pdfjs-document"
                  >
                    <Page pageNumber={pageNumber} className="pdfjs-page" rotate={rotations[pageNumber - 1] || 0} />
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
                        pointerEvents: (deleteMode || eraseMode || moveMode) ? 'auto' : 'none',
                        borderRadius: 2,
                        cursor: moveMode ? 'move' : (deleteMode || eraseMode) ? 'pointer' : 'default',
                        border: deleteMode ? '2px solid #c00' : eraseMode ? '2px solid #00796b' : moveMode ? '2px solid #3730a3' : 'none',
                        boxSizing: 'border-box',
                      }}
                      onMouseDown={moveMode ? (e) => handleElementMouseDown('highlight', el.id, e) : undefined}
                      onClick={
                        deleteMode || eraseMode
                          ? () => handleDeleteHighlight(el.id)
                          : undefined
                      }
                      title={
                        moveMode
                          ? 'Drag to move highlight'
                          : deleteMode
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

                  {/* Render text elements */}
                  {textElements.filter(el => el.page === pageNumber).map(element => (
                    <div 
                      key={element.id}
                      style={{
                        position: 'absolute',
                        left: `${element.position.x}px`,
                        top: `${element.position.y}px`,
                        color: element.color || '#000',
                        pointerEvents: (deleteMode || eraseMode || moveMode) ? 'auto' : 'none',
                        background: 'transparent',
                        fontSize: 16,
                        cursor: moveMode ? 'move' : (deleteMode || eraseMode) ? 'pointer' : 'default',
                        border: deleteMode ? '1px dashed #c00' : eraseMode ? '1px dashed #00796b' : moveMode ? '1px dashed #3730a3' : 'none',
                      }}
                      onMouseDown={moveMode ? (e) => handleElementMouseDown('text', element.id, e) : undefined}
                      onClick={
                        deleteMode || eraseMode
                          ? () => handleDeleteText(element.id)
                          : undefined
                      }
                      title={
                        moveMode
                          ? 'Drag to move text'
                          : deleteMode
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
              </>
            ) : (
              <div className="pdf-placeholder">PDF Preview/Editor Area</div>
            )}
            {/* Download popup menu */}
            {showDownloadPopup && (
              <div style={{
                position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 1000,
                background: 'rgba(30, 16, 60, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  background: '#fff', borderRadius: 12, boxShadow: '0 4px 32px #0002', padding: 32, minWidth: 320,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}>
                  <h3 style={{marginBottom: 16, color: '#6c2bd7'}}>Download PDF</h3>
                  <input
                    type="text"
                    value={downloadFileName}
                    onChange={e => setDownloadFileName(e.target.value)}
                    style={{
                      padding: '8px 12px', fontSize: 16, borderRadius: 6, border: '1px solid #9d4edd', width: '100%', marginBottom: 18,
                    }}
                    autoFocus
                  />
                  <div style={{display: 'flex', gap: 16}}>
                    <button onClick={handleDownloadConfirm} style={{background: '#9d4edd', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer'}}>Download</button>
                    <button onClick={handleDownloadCancel} style={{background: '#eee', color: '#3730a3', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer'}}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
            {/* Reorder modal */}
            {showReorderModal && (
              <div style={{position:'fixed',left:0,top:0,width:'100vw',height:'100vh',zIndex:1000,background:'rgba(30,16,60,0.25)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{background:'#fff',borderRadius:12,boxShadow:'0 4px 32px #0002',padding:32,minWidth:340,maxWidth:600}}>
                  <h3 style={{marginBottom:16,color:'#6c2bd7'}}>Reorder Pages</h3>
                  <div style={{display:'flex',gap:12,overflowX:'auto',marginBottom:18}}>
                    {pageOrder.map((pageIdx, i) => (
                      <div key={pageIdx}
                        draggable
                        onDragStart={handleDragStart(i)}
                        onDrop={handleDrop(i)}
                        onDragOver={handleDragOver}
                        style={{border:'2px solid #9d4edd',borderRadius:6,padding:4,background:'#f8f6ff',minWidth:80,textAlign:'center',cursor:'grab',position:'relative'}}
                      >
                        <div style={{width:60,height:80,margin:'0 auto',background:'#eee',borderRadius:4,overflow:'hidden',position:'relative'}}>
                          <Document file={pdfFile} loading={null}>
                            <Page
                              pageNumber={pageIdx+1}
                              width={60}
                              height={80}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                              rotate={rotations[pageIdx] || 0}
                              loading={null}
                            />
                          </Document>
                        </div>
                        <span style={{fontWeight:600,fontSize:13,display:'block',marginTop:4}}>Page {pageIdx+1}</span>
                        <button onClick={() => handleRotatePage(pageIdx)} style={{marginTop:2,fontSize:11,padding:'2px 8px',borderRadius:4,border:'1px solid #9d4edd',background:'#f3eaff',color:'#6c2bd7',cursor:'pointer'}}>Rotate</button>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:16,justifyContent:'center'}}>
                    <button onClick={handleReorderConfirm} style={{background:'#9d4edd',color:'#fff',border:'none',borderRadius:6,padding:'8px 18px',fontWeight:600,fontSize:15,cursor:'pointer'}}>Confirm</button>
                    <button onClick={()=>setShowReorderModal(false)} style={{background:'#eee',color:'#3730a3',border:'none',borderRadius:6,padding:'8px 18px',fontWeight:600,fontSize:15,cursor:'pointer'}}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </main>
          {showEditToolbar ? (
            <EditToolbar
              onBack={() => setShowEditToolbar(false)}
              onToolSelect={handleEditToolSelect}
              activeTool={activeEditTool}
            />
          ) : (
            <footer className="editor-toolbar">
              {TOOLBAR_TOOLS.map((tool, idx) => (
                <div
                  className="toolbar-tool"
                  key={tool.label}
                  onClick={() => {
                    if (tool.label === 'Edit') setShowEditToolbar(true);
                    if (tool.label === 'Delete') handleDeletePage();
                    if (tool.label === 'Download') handleDownloadPdf();
                    if (tool.label === 'Enhance') handleEnhancePdf();
                    if (tool.label === 'Rotate') handleRotateCurrentPage();
                  }}
                >
                  <div className="tool-icon">{tool.icon}</div>
                  <div className="tool-label">{tool.label}</div>
                </div>
              ))}
              {enhanceStatus && (
                <div style={{ position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)', background: '#fff', color: '#6c2bd7', borderRadius: 8, padding: '10px 24px', boxShadow: '0 2px 12px #0002', fontWeight: 600, zIndex: 100 }}>
                  {enhanceStatus}
                </div>
              )}
            </footer>
          )}
        </>
      )}
    </div>
  );
}
