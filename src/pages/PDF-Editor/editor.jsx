import React, { useRef, useState, useEffect } from 'react';
import { FaFileUpload, FaEdit, FaTrash, FaDownload, FaSyncAlt } from 'react-icons/fa';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './editor.css';
import './react-pdf-overrides.css';
import EditToolbar from './EditToolbar';
import FilterToolbar from './FilterToolbar';

const TOOLBAR_TOOLS = [
  { icon: <FaEdit />, label: 'Edit' },
  { icon: <FaSyncAlt />, label: 'Filter' }, // Filter is now second
  { icon: <FaTrash />, label: 'Delete' },
  { icon: <FaDownload />, label: 'Download' },
  { icon: <FaSyncAlt />, label: 'Rotate' },
];

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

function dataURLToUint8Array(dataURL) {
  const base64 = dataURL.split(',')[1];
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default function Editor() {
  const [pdfFile, setPdfFile] = useState(null);
  const [showModal, setShowModal] = useState(true);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [showEditToolbar, setShowEditToolbar] = useState(false);
  const [activeEditTool, setActiveEditTool] = useState(null);
  const [showFilterToolbar, setShowFilterToolbar] = useState(false);
  const [activeFilterTool, setActiveFilterTool] = useState(null);
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
  const [bwFilter, setBwFilter] = useState(false);
  const [isProcessingDownload, setIsProcessingDownload] = useState(false);

  // Download PDF functionality with styled popup menu
  const [showDownloadPopup, setShowDownloadPopup] = useState(false);
  const [downloadFileName, setDownloadFileName] = useState('');
  const [rotations, setRotations] = useState({}); // {pageIdx: rotation}

  const [undoStack, setUndoStack] = useState([]); // For revert/undo  // Reorder pages state
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [pageOrder, setPageOrder] = useState([]);
  const [draggedPage, setDraggedPage] = useState(null);
  const [touchStartPos, setTouchStartPos] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Helper to push current PDF to undo stack before destructive changes
  const pushToUndoStack = () => {
    if (pdfFile) setUndoStack(stack => [...stack, pdfFile]);
  };

  const handleRevert = () => {
    if (undoStack.length > 0) {
      const prev = undoStack[undoStack.length - 1];
      setPdfFile(prev);
      setUndoStack(stack => stack.slice(0, -1));
      // Optionally reset page/annotations if needed
    }
  };

  const handleDownloadPdf = () => {
    if (!pdfFile) return;
    setDownloadFileName(pdfFile.name || 'document.pdf');
    setShowDownloadPopup(true);
  };

  const handleDownloadConfirm = async () => {
    let fileName = downloadFileName.trim();
    if (!fileName) return;
    if (!fileName.toLowerCase().endsWith('.pdf')) fileName += '.pdf';
    if (bwFilter || activeFilterTool) {
      setIsProcessingDownload(true);
      // True filtered export: render each page to canvas, apply filter, and re-embed
      const { PDFDocument } = await import('pdf-lib');
      const arrayBuffer = await pdfFile.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const newPdfDoc = await PDFDocument.create();
      for (let i = 0; i < pdf.numPages; i++) {
        const page = await pdf.getPage(i + 1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        // Apply filter to canvas
        let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (activeFilterTool === 'grayscale' || bwFilter) {
          for (let j = 0; j < imgData.data.length; j += 4) {
            const avg = 0.299 * imgData.data[j] + 0.587 * imgData.data[j + 1] + 0.114 * imgData.data[j + 2];
            imgData.data[j] = imgData.data[j + 1] = imgData.data[j + 2] = avg;
          }
        } else if (activeFilterTool === 'sepia') {
          for (let j = 0; j < imgData.data.length; j += 4) {
            const r = imgData.data[j], g = imgData.data[j+1], b = imgData.data[j+2];
            imgData.data[j]     = Math.min(255, 0.393*r + 0.769*g + 0.189*b);
            imgData.data[j + 1] = Math.min(255, 0.349*r + 0.686*g + 0.168*b);
            imgData.data[j + 2] = Math.min(255, 0.272*r + 0.534*g + 0.131*b);
          }
        } else if (activeFilterTool === 'brighten') {
          for (let j = 0; j < imgData.data.length; j += 4) {
            imgData.data[j]     = Math.min(255, imgData.data[j] * 1.3);
            imgData.data[j + 1] = Math.min(255, imgData.data[j + 1] * 1.3);
            imgData.data[j + 2] = Math.min(255, imgData.data[j + 2] * 1.3);
          }
        } else if (activeFilterTool === 'darken') {
          for (let j = 0; j < imgData.data.length; j += 4) {
            imgData.data[j]     = imgData.data[j] * 0.7;
            imgData.data[j + 1] = imgData.data[j + 1] * 0.7;
            imgData.data[j + 2] = imgData.data[j + 2] * 0.7;
          }
        }
        ctx.putImageData(imgData, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        const pngBytes = dataURLToUint8Array(pngUrl);
        const img = await newPdfDoc.embedPng(pngBytes);
        const pageDims = { width: viewport.width, height: viewport.height };
        const pdfPage = newPdfDoc.addPage([pageDims.width, pageDims.height]);
        pdfPage.drawImage(img, { x: 0, y: 0, width: pageDims.width, height: pageDims.height });
      }
      const newPdfBytes = await newPdfDoc.save();
      const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsProcessingDownload(false);
        setShowDownloadPopup(false);
      }, 100);
    } else {
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
    }
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
    } else if (tool === 'reorder') {
      setActiveEditTool(tool);
      setShowReorderModal(true);
      // Initialize page order array
      setPageOrder(Array.from({ length: numPages }, (_, i) => i + 1));
    } else {
      setActiveEditTool(tool);
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
    }  };
  // Handle page reordering with enhanced touch support
  const handlePageDragStart = (e, pageIndex) => {
    setDraggedPage(pageIndex);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', pageIndex);
    
    // Add visual feedback
    setTimeout(() => {
      const element = e.target;
      element.style.opacity = '0.7';
    }, 0);
  };

  const handlePageDragOver = (e, targetIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(targetIndex);
  };

  const handlePageDragEnter = (e, targetIndex) => {
    e.preventDefault();
    setDragOverIndex(targetIndex);
  };

  const handlePageDragLeave = (e) => {
    // Only clear if leaving the grid area
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handlePageDrop = (e, targetIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    setIsDragging(false);
    
    if (draggedPage === null || draggedPage === targetIndex) {
      setDraggedPage(null);
      return;
    }
    
    const newOrder = [...pageOrder];
    const draggedItem = newOrder[draggedPage];
    newOrder.splice(draggedPage, 1);
    newOrder.splice(targetIndex, 0, draggedItem);
    
    setPageOrder(newOrder);
    setDraggedPage(null);
  };

  const handlePageDragEnd = (e) => {
    setDraggedPage(null);
    setIsDragging(false);
    setDragOverIndex(null);
    e.target.style.opacity = '1';
  };

  // Touch events for mobile drag and drop
  const handleTouchStart = (e, pageIndex) => {
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setDraggedPage(pageIndex);
    
    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleTouchMove = (e, pageIndex) => {
    if (!touchStartPos || draggedPage === null) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.y);
    
    // Start dragging if moved enough
    if (deltaX > 10 || deltaY > 10) {
      setIsDragging(true);
      
      // Find element under touch
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      const pageItem = elementBelow?.closest('.reorder-page-item');
      if (pageItem) {
        const targetIndex = parseInt(pageItem.dataset.index);
        if (!isNaN(targetIndex)) {
          setDragOverIndex(targetIndex);
        }
      }
    }
  };

  const handleTouchEnd = (e, pageIndex) => {
    if (!isDragging || draggedPage === null || dragOverIndex === null) {
      setTouchStartPos(null);
      setDraggedPage(null);
      setIsDragging(false);
      setDragOverIndex(null);
      return;
    }
    
    // Perform the reorder
    if (draggedPage !== dragOverIndex) {
      const newOrder = [...pageOrder];
      const draggedItem = newOrder[draggedPage];
      newOrder.splice(draggedPage, 1);
      newOrder.splice(dragOverIndex, 0, draggedItem);
      setPageOrder(newOrder);
      
      // Haptic feedback for successful drop
      if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
      }
    }
    
    setTouchStartPos(null);
    setDraggedPage(null);
    setIsDragging(false);
    setDragOverIndex(null);
  };

  const applyPageReorder = async () => {
    if (!pdfFile || pageOrder.length === 0) return;
    
    pushToUndoStack();
    setIsProcessingDownload(true);
    
    try {
      const { PDFDocument } = await import('pdf-lib');
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const newPdfDoc = await PDFDocument.create();
      
      // Copy pages in new order
      for (const pageNum of pageOrder) {
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageNum - 1]);
        newPdfDoc.addPage(copiedPage);
      }
      
      const newPdfBytes = await newPdfDoc.save();
      const newFile = new File([newPdfBytes], pdfFile.name || 'document.pdf', { type: 'application/pdf' });
      setPdfFile(newFile);
      
      // Reset to first page
      setPageNumber(1);
      setShowReorderModal(false);
    } catch (error) {
      console.error('Error reordering pages:', error);
    } finally {
      setIsProcessingDownload(false);
    }
  };
  const cancelPageReorder = () => {
    setShowReorderModal(false);
    setPageOrder([]);
    setDraggedPage(null);
    setTouchStartPos(null);
    setIsDragging(false);
    setDragOverIndex(null);
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
    pushToUndoStack();
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

  // Add handler for toolbar rotate button
  const handleRotateCurrentPage = () => {
    pushToUndoStack();
    setRotations(prev => ({
      ...prev,
      [pageNumber - 1]: ((prev[pageNumber - 1] || 0) + 90) % 360
    }));
  };

  // Compute CSS filter string based on activeFilterTool
  let pdfFilter = '';
  if (activeFilterTool === 'grayscale') pdfFilter = 'grayscale(1)';
  if (activeFilterTool === 'sepia') pdfFilter = 'sepia(1)';
  if (activeFilterTool === 'brighten') pdfFilter = 'brightness(1.3)';
  if (activeFilterTool === 'darken') pdfFilter = 'brightness(0.7)';

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
          {/* Page navigation bar above the PDF preview (not above toolbar) */}
          {!showModal && pdfFile && numPages && (
            <div className="editor-page-nav">
              <button
                className="page-nav-btn"
                onClick={() => handlePageChange(pageNumber - 1)}
                disabled={pageNumber <= 1}
              >
                Prev
              </button>
              <span className="page-nav-info">
                Page {pageNumber} of {numPages}
              </span>
              <button
                className="page-nav-btn"
                onClick={() => handlePageChange(pageNumber + 1)}
                disabled={pageNumber >= numPages}
              >
                Next
              </button>
            </div>
          )}
          <main className="editor-main">
            {pdfFile ? (
              <>
                <div
                  className={`pdfjs-preview-wrapper${bwFilter ? ' bw-filter' : ''}`}
                  ref={pdfContainerRef}
                  onClick={handlePageClick}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseDown={handleMouseDown}
                  onContextMenu={handlePdfAreaContextMenu}
                  style={pdfFilter ? { filter: pdfFilter } : {}}
                >
                  {/* Delete mode indicator */}
                  {deleteMode && (
                    <div className="editor-indicator delete-mode">
                      Delete Mode: Click an annotation to remove it
                    </div>
                  )}
                  {/* Erase mode indicator */}
                  {eraseMode && (
                    <div className="editor-indicator erase-mode">
                      Erase Mode: Click a text, highlight, drawing, or image to erase it
                    </div>
                  )}
                  {/* Move mode indicator */}
                  {moveMode && (
                    <div className="editor-indicator move-mode">
                      Move Mode: Drag and drop text, highlight, or drawing
                    </div>
                  )}
                  {/* Tool color pickers */}
                  {activeEditTool === 'addText' && (
                    <div className="color-picker text-color-picker">
                      <label>Text Color:</label>
                      <input
                        type="color"
                        value={textColor}
                        onChange={e => setTextColor(e.target.value)}
                      />
                    </div>
                  )}
                  {activeEditTool === 'highlight' && (
                    <div className="color-picker highlight-color-picker">
                      <label>Highlight Color:</label>
                      <input
                        type="color"
                        value={highlightColor}
                        onChange={e => setHighlightColor(e.target.value)}
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
                      className={`pdf-highlight${moveMode ? ' move' : ''}${deleteMode ? ' delete' : ''}${eraseMode ? ' erase' : ''}`}
                      style={{
                        left: el.x,
                        top: el.y,
                        width: el.width,
                        height: el.height,
                        background: el.color,
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
                        left: Math.min(highlightStart.x, highlightStart.x2),
                        top: Math.min(highlightStart.y, highlightStart.y2),
                        width: Math.abs(highlightStart.x2 - highlightStart.x),
                        height: Math.abs(highlightStart.y2 - highlightStart.y),
                        background: highlightColor,
                      }}
                      className="pdf-highlight highlight-preview"
                    />
                  )}

                  {/* Render text elements */}
                  {textElements.filter(el => el.page === pageNumber).map(element => (
                    <div 
                      key={element.id}
                      className={`pdf-text${moveMode ? ' move' : ''}${deleteMode ? ' delete' : ''}${eraseMode ? ' erase' : ''}`}
                      style={{
                        left: `${element.position.x}px`,
                        top: `${element.position.y}px`,
                        color: element.color || '#000',
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
                      className="pdf-text-input"
                      style={{
                        left: `${newTextPosition.x}px`,
                        top: `${newTextPosition.y}px`,
                        color: textColor,
                      }}
                      value={newTextContent}
                      onChange={handleTextInputChange}
                      onKeyDown={handleTextInputKeyDown}
                      onBlur={handleTextInputBlur}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="pdf-placeholder">PDF Preview/Editor Area</div>
            )}
            {/* Download popup menu */}
            {showDownloadPopup && (
              <div className="editor-modal-bg">
                <div className="editor-modal download-modal">
                  <h3>Download PDF</h3>
                  <input
                    type="text"
                    value={downloadFileName}
                    onChange={e => setDownloadFileName(e.target.value)}
                    className="editor-modal-input"
                    autoFocus
                  />
                  <div className="editor-modal-btns">
                    <button onClick={handleDownloadConfirm} className="editor-modal-btn confirm" disabled={isProcessingDownload}>
                      {isProcessingDownload ? 'Processing...' : 'Download'}
                    </button>
                    <button onClick={handleDownloadCancel} className="editor-modal-btn cancel" disabled={isProcessingDownload}>Cancel</button>
                  </div>
                  {isProcessingDownload && <div className="editor-modal-status">Generating B&W PDF...</div>}
                </div>
              </div>
            )}            {/* Reorder pages modal */}
            {showReorderModal && (
              <div className="editor-modal-bg">
                <div className="editor-modal reorder-modal">
                  <h3>Reorder Pages</h3>
                  <p>Drag and drop to reorder pages</p>
                  <div className="reorder-pages-container">
                    <div className="reorder-pages-grid">
                    {pageOrder.map((pageNum, index) => (
                      <div
                        key={`page-${pageNum}-${index}`}
                        data-index={index}
                        className={`reorder-page-item${
                          draggedPage === index ? ' dragging' : ''
                        }${dragOverIndex === index ? ' drag-over' : ''}${
                          isDragging && draggedPage !== index ? ' drag-active' : ''
                        }`}
                        draggable
                        onDragStart={(e) => handlePageDragStart(e, index)}
                        onDragOver={(e) => handlePageDragOver(e, index)}
                        onDragEnter={(e) => handlePageDragEnter(e, index)}
                        onDragLeave={handlePageDragLeave}
                        onDrop={(e) => handlePageDrop(e, index)}
                        onDragEnd={handlePageDragEnd}
                        onTouchStart={(e) => handleTouchStart(e, index)}
                        onTouchMove={(e) => handleTouchMove(e, index)}
                        onTouchEnd={(e) => handleTouchEnd(e, index)}
                        style={{
                          transform: draggedPage === index && isDragging 
                            ? 'scale(1.05) rotate(5deg)' 
                            : dragOverIndex === index && isDragging
                            ? 'scale(1.02)'
                            : 'scale(1)',
                          transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          zIndex: draggedPage === index ? 1000 : 1
                        }}
                      >
                        <div className="reorder-page-number">Page {pageNum}</div>                        <div className="reorder-page-preview">
                          <Document file={pdfFile} className="reorder-pdf-document">
                            <Page 
                              pageNumber={pageNum} 
                              scale={0.5}
                              className="reorder-pdf-page"
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                            />
                          </Document>
                        </div>
                        <div className="reorder-drag-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>                      </div>
                    ))}
                  </div>
                  </div>
                  <div className="editor-modal-btns">
                    <button 
                      onClick={applyPageReorder} 
                      className="editor-modal-btn confirm"
                      disabled={isProcessingDownload}
                    >
                      {isProcessingDownload ? 'Processing...' : 'Apply Changes'}
                    </button>
                    <button 
                      onClick={cancelPageReorder} 
                      className="editor-modal-btn cancel"
                      disabled={isProcessingDownload}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
          {/* Toolbar always at the bottom */}
          {showEditToolbar ? (
            <EditToolbar
              onBack={() => setShowEditToolbar(false)}
              onToolSelect={handleEditToolSelect}
              activeTool={activeEditTool}
            />
          ) : showFilterToolbar ? (
            <FilterToolbar
              onBack={() => {
                setShowFilterToolbar(false);
              }}
              onToolSelect={tool => {
                if (tool === 'back') {
                  setShowFilterToolbar(false);
                } else if (tool === 'none') {
                  setActiveFilterTool(null); // Remove filter
                } else {
                  setActiveFilterTool(tool);
                }
              }}
              activeTool={activeFilterTool}
            />
          ) : (
            <footer className="editor-toolbar">
              {TOOLBAR_TOOLS.map((tool, idx) => (
                <div
                  className="toolbar-tool"
                  key={tool.label}
                  onClick={() => {
                    if (tool.label === 'Edit') {
                      setShowEditToolbar(true);
                      setShowFilterToolbar(false);
                    }
                    if (tool.label === 'Filter') {
                      setShowFilterToolbar(true);
                      setShowEditToolbar(false);
                    }
                    if (tool.label === 'Delete') handleDeletePage();
                    if (tool.label === 'Download') handleDownloadPdf();
                    if (tool.label === 'Rotate') handleRotateCurrentPage();
                  }}
                >
                  <div className="tool-icon">{tool.icon}</div>
                  <div className="tool-label">{tool.label}</div>
                </div>
              ))}
              {/* Revert button */}
              <div
                className={`toolbar-tool${undoStack.length === 0 ? ' disabled' : ''}`}
                onClick={undoStack.length === 0 ? undefined : handleRevert}
                title="Revert last change"
              >
                <div className="tool-icon">&#8630;</div>
                <div className="tool-label">Revert</div>
              </div>
            </footer>
          )}
        </>
      )}
    </div>
  );
}
