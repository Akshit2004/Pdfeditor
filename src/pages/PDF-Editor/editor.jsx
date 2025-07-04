import React, { useRef, useState, useEffect } from 'react';
import { FaFileUpload, FaEdit, FaTrash, FaDownload, FaSyncAlt } from 'react-icons/fa';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './editor.css';
import './react-pdf-overrides.css';
import EditToolbar from './EditToolbar';
import FilterToolbar from './FilterToolbar';
import ThemeSwitcher from '../../components/ThemeSwitcher';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const TOOLBAR_TOOLS = [
  { icon: <FaEdit />, label: 'Edit' },
  { icon: <FaSyncAlt />, label: 'Filter' },
  { icon: <FaTrash />, label: 'Delete' },
  { icon: <FaDownload />, label: 'Download' },
  { icon: <FaSyncAlt />, label: 'Rotate' },
  { icon: <FaDownload />, label: 'Export PNG' },
  { icon: <span role="img" aria-label="Signature">✍️</span>, label: 'Signature' }, // Signature tool
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
    // Upload animation states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const [undoStack, setUndoStack] = useState([]); // For revert/undo  // Reorder pages state
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [pageOrder, setPageOrder] = useState([]);
  const [draggedPage, setDraggedPage] = useState(null);
  const [touchStartPos, setTouchStartPos] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [showExportPngModal, setShowExportPngModal] = useState(false);
  const [exportPngAllPages, setExportPngAllPages] = useState(true);
  const [exportPngSelectedPages, setExportPngSelectedPages] = useState([]);
  const [isExportingPng, setIsExportingPng] = useState(false);

  // Signature state
  const [signatureImage, setSignatureImage] = useState(null); // uploaded image data url
  const [isAddingSignature, setIsAddingSignature] = useState(false);
  const [signatures, setSignatures] = useState([]); // { id, page, position: {x, y}, imageUrl }
  const signatureInputRef = useRef();
  const [showSignatureModal, setShowSignatureModal] = useState(false); // NEW: modal for signature preview

  // --- Add this function inside Editor ---
  const handleSignatureTool = () => {
    setShowEditToolbar(false);
    setShowFilterToolbar(false);
    if (signatureInputRef.current) {
      signatureInputRef.current.value = null; // Reset input so same file can be re-uploaded
      signatureInputRef.current.click();
    }
  };

  // Helper to push current PDF and annotation states to undo stack before destructive changes
  const pushToUndoStack = () => {
    if (pdfFile) {
      setUndoStack(stack => [
        ...stack,
        {
          pdfFile,
          signatures: [...signatures],
          // Optionally add other annotation states here
        }
      ]);
    }
  };

  const handleRevert = () => {
    if (undoStack.length > 0) {
      const prev = undoStack[undoStack.length - 1];
      setPdfFile(prev.pdfFile);
      setSignatures(prev.signatures || []);
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
    
    // Check if we have any annotations (text or highlights) or filters to apply
    const hasAnnotations = textElements.length > 0 || highlightElements.length > 0;
    const hasFilters = bwFilter || activeFilterTool;
    
    if (hasAnnotations || hasFilters) {
      setIsProcessingDownload(true);
      // Enhanced export: render each page to canvas, add annotations, apply filters, and re-embed
      const { PDFDocument } = await import('pdf-lib');
      const arrayBuffer = await pdfFile.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const newPdfDoc = await PDFDocument.create();
        for (let i = 0; i < pdf.numPages; i++) {
        const pageNum = i + 1;
        const page = await pdf.getPage(pageNum);
        
        // Use scale 1.5 instead of 2 for better performance while maintaining quality
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        
        // Render the original PDF page
        await page.render({ canvasContext: ctx, viewport }).promise;        // Add highlights for this page
        const pageHighlights = highlightElements.filter(el => el.page === pageNum);
        pageHighlights.forEach(highlight => {
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = highlight.color;
          
          // Calculate proper scaling based on the viewport and container dimensions
          // Only use displayed page element if we're exporting the currently visible page
          let scaleX = 1;
          let scaleY = 1;
          
          if (pageNum === pageNumber && pdfContainerRef.current) {
            // For the currently displayed page, calculate scale from actual display dimensions
            const pdfPageElement = document.querySelector('.pdfjs-page canvas');
            if (pdfPageElement) {
              const displayedWidth = pdfPageElement.offsetWidth;
              const displayedHeight = pdfPageElement.offsetHeight;
              scaleX = viewport.width / displayedWidth;
              scaleY = viewport.height / displayedHeight;
            }
          } else {
            // For other pages, use a standard scale ratio
            // Assume standard display scaling (typical web display is around 96 DPI)
            const standardDisplayScale = 1.5; // This matches our viewport scale
            scaleX = standardDisplayScale;
            scaleY = standardDisplayScale;
          }
          
          ctx.fillRect(
            highlight.x * scaleX,
            highlight.y * scaleY,
            highlight.width * scaleX,
            highlight.height * scaleY
          );
          ctx.restore();
        });          // Add text elements for this page
        const pageTexts = textElements.filter(el => el.page === pageNum);
        pageTexts.forEach(textEl => {
          ctx.save();
          ctx.fillStyle = textEl.color || '#000000';
          
          // Calculate proper scaling based on the viewport and container dimensions
          // Only use displayed page element if we're exporting the currently visible page
          let scaleX = 1;
          let scaleY = 1;
          
          if (pageNum === pageNumber && pdfContainerRef.current) {
            // For the currently displayed page, calculate scale from actual display dimensions
            const pdfPageElement = document.querySelector('.pdfjs-page canvas');
            if (pdfPageElement) {
              const displayedWidth = pdfPageElement.offsetWidth;
              const displayedHeight = pdfPageElement.offsetHeight;
              scaleX = viewport.width / displayedWidth;
              scaleY = viewport.height / displayedHeight;
            }
          } else {
            // For other pages, use a standard scale ratio
            // Assume standard display scaling (typical web display is around 96 DPI)
            const standardDisplayScale = 1.5; // This matches our viewport scale
            scaleX = standardDisplayScale;
            scaleY = standardDisplayScale;
          }
          
          // Scale font size proportionally
          const scaledFontSize = Math.round(16 * Math.min(scaleX, scaleY));
          ctx.font = `${scaledFontSize}px Arial`;
          
          ctx.fillText(
            textEl.content,
            textEl.position.x * scaleX,
            textEl.position.y * scaleY
          );
          ctx.restore();
        });
        
        // Apply filters to canvas if needed
        if (hasFilters) {
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
        }
        
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
      // Simple export for PDFs without annotations or filters
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
  };  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadSuccess(false);
      
      // Animate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 100);
      
      // Simulate processing time for smooth UX
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setUploadProgress(100);
      setUploadSuccess(true);
      
      setTimeout(() => {
        setPdfFile(file);
        setShowModal(false);
        setPageNumber(1);
        setIsUploading(false);
        setUploadProgress(0);
        setUploadSuccess(false);
      }, 1200);
    }
  };

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      const file = files[0];
      setIsUploading(true);
      setUploadProgress(0);
      setUploadSuccess(false);
      
      // Animate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 100);
      
      // Simulate processing time for smooth UX
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setUploadProgress(100);
      setUploadSuccess(true);
      
      setTimeout(() => {
        setPdfFile(file);
        setShowModal(false);
        setPageNumber(1);
        setIsUploading(false);
        setUploadProgress(0);
        setUploadSuccess(false);
      }, 1200);
    }
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
      
      // Update page references for text and highlight elements to match new page order
      const pageMapping = {};
      pageOrder.forEach((originalPageNum, newIndex) => {
        pageMapping[originalPageNum] = newIndex + 1; // Map original page to new position
      });
      
      // Update text elements with new page numbers
      setTextElements(prevElements => 
        prevElements.map(element => ({
          ...element,
          page: pageMapping[element.page] || element.page
        }))
      );
        // Update highlight elements with new page numbers  
      setHighlightElements(prevElements =>
        prevElements.map(element => ({
          ...element,
          page: pageMapping[element.page] || element.page
        }))
      );
      
      // Update rotation state to match new page order
      setRotations(prevRotations => {
        const newRotations = {};
        pageOrder.forEach((originalPageNum, newIndex) => {
          const originalRotation = prevRotations[originalPageNum - 1];
          if (originalRotation !== undefined) {
            newRotations[newIndex] = originalRotation;
          }
        });
        return newRotations;
      });
      
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

  // Helper to get the PDF page canvas and its bounding rect
const getPdfPageCanvasRect = () => {
  const pdfPage = document.querySelector('.pdfjs-page canvas');
  if (pdfPage) {
    return pdfPage.getBoundingClientRect();
  }
  return null;
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
    if (isAddingSignature && signatureImage) {
      const canvasRect = getPdfPageCanvasRect();
      if (canvasRect) {
        pushToUndoStack(); // <--- Add this line
        const x = e.clientX - canvasRect.left;
        const y = e.clientY - canvasRect.top;
        setSignatures([...signatures, {
          id: Date.now(),
          page: pageNumber,
          position: { x, y },
          imageUrl: signatureImage,
        }]);
        setIsAddingSignature(false);
        setSignatureImage(null);
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
        
        // End the highlight tool after one use
        setActiveEditTool(null);
        setShowEditToolbar(false);
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

  // Helper to handle PNG export
  const handleExportPng = () => {
    setShowExportPngModal(true);
    setExportPngAllPages(true);
    setExportPngSelectedPages([]);
  };

  const handleExportPngConfirm = async () => {
    if (!pdfFile) return;
    setIsExportingPng(true);
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let pagesToExport = [];
      if (exportPngAllPages) {
        pagesToExport = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
      } else {
        pagesToExport = exportPngSelectedPages;
      }
      if (pagesToExport.length === 1) {
        // Single page export
        const pageNum = pagesToExport[0];
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        canvas.toBlob(blob => {
          saveAs(blob, `page-${pageNum}.png`);
        }, 'image/png');
      } else {
        // Multiple pages: zip
        const zip = new JSZip();
        for (let i = 0; i < pagesToExport.length; i++) {
          const pageNum = pagesToExport[i];
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
          const dataUrl = canvas.toDataURL('image/png');
          zip.file(`page-${pageNum}.png`, dataURLToUint8Array(dataUrl));
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, 'pdf-pages.zip');
      }
    } catch (err) {
      alert('Failed to export PNGs.');
    }
    setIsExportingPng(false);
    setShowExportPngModal(false);
  };

  // PNG Preview Grid Component
function PngPreviewGrid({ pdfFile, pageNums }) {
  const visiblePages = pageNums.slice(0, 6);
  return (
    <div style={{
      margin: '1rem 0',
      display: 'flex',
      gap: 16,
      overflowX: pageNums.length > 6 ? 'auto' : 'visible',
      maxWidth: 6 * 130 + 24, // 6 images + gap
      paddingBottom: 8,
    }}>
      {visiblePages.map(pageNum => (
        <PngPreview key={pageNum} pdfFile={pdfFile} pageNum={pageNum} />
      ))}
      {pageNums.length > 6 && (
        <div style={{alignSelf: 'center', color: '#aaa', fontSize: 13, minWidth: 80}}>
          +{pageNums.length - 6} more...
        </div>
      )}
    </div>
  );
}

// PNG Preview Component
function PngPreview({ pdfFile, pageNum }) {
  const [imgUrl, setImgUrl] = React.useState(null);
  React.useEffect(() => {
    let cancelled = false;
    async function renderPreview() {
      if (!pdfFile || !pageNum) return;
      const arrayBuffer = await pdfFile.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      const url = canvas.toDataURL('image/png');
      if (!cancelled) setImgUrl(url);
    }
    renderPreview();
    return () => { cancelled = true; };
  }, [pdfFile, pageNum]);
  if (!imgUrl) return <div style={{margin: '1rem 0', color: '#aaa', minWidth: 120, minHeight: 90}}>Loading...</div>;
  return (
    <div style={{textAlign: 'center', minWidth: 120}}>
      <img src={imgUrl} alt={`PNG Preview page ${pageNum}`} style={{maxWidth: 110, maxHeight: 90, borderRadius: 8, boxShadow: '0 2px 12px #6a82fb22'}} />
      <div style={{fontSize: 12, color: '#888', marginTop: 2}}>Page {pageNum}</div>
    </div>
  );
}

  return (
    <div className="editor-bg">      {showModal && (
        <div className="glass-modal">
          <div className="modal-content">
            {!isUploading ? (
              <>
                <div 
                  className={`upload-drop-zone ${dragOver ? 'drag-over' : ''}`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <FaFileUpload className="modal-upload-icon" />
                  <h2 className="modal-title">Upload your PDF</h2>
                  <p className="modal-desc">
                    {dragOver ? 'Drop your PDF file here!' : 'Drag & drop or click to select a PDF file'}
                  </p>
                  <button 
                    className={`modal-upload-btn ${dragOver ? 'drag-active' : ''}`} 
                    onClick={handleUploadClick}
                  >
                    Choose PDF
                  </button>
                </div>
              </>            ) : (
              <div className="upload-progress-container">
                {!uploadSuccess ? (
                  <>
                    <div className="upload-spinner">
                      <div className="spinner-ring"></div>
                      <FaFileUpload className="spinner-icon" />
                    </div>
                    <h3 className="upload-title">Uploading PDF...</h3>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="upload-percentage">{Math.round(uploadProgress)}%</p>
                  </>
                ) : (
                  <div className="upload-success">
                    <div className="success-checkmark">
                      <svg viewBox="0 0 52 52" className="checkmark">
                        <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                        <path className="checkmark-check" fill="none" d="m14.1 27.2l7.1 7.2 16.7-16.8"/>
                      </svg>
                    </div>
                    <h3 className="success-title">Upload Complete!</h3>
                    <p className="success-message">Your PDF is ready to edit</p>
                  </div>
                )}
              </div>
            )}
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
            <ThemeSwitcher />
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
                  {/* Render signature images */}
                  {signatures.filter(sig => sig.page === pageNumber).map(sig => {
                    // Render relative to the PDF page canvas
                    const canvasRect = getPdfPageCanvasRect();
                    let left = sig.position.x;
                    let top = sig.position.y;
                    // Fallback if canvas not found
                    if (!canvasRect) {
                      left = sig.position.x;
                      top = sig.position.y;
                    }
                    return (
                      <img
                        key={sig.id}
                        src={sig.imageUrl}
                        alt="Signature"
                        className="pdf-signature"
                        style={{
                          position: 'absolute',
                          left: left,
                          top: top,
                          width: 120,
                          height: 'auto',
                          pointerEvents: 'none',
                          zIndex: 10,
                        }}
                      />
                    );
                  })}
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
                  {isProcessingDownload && <div className="editor-modal-status">Processing PDF...</div>}
                </div>
              </div>
            )}            {/* Export PNG Modal */}
            {showExportPngModal && (
              <div
                style={{
                  position: "fixed",
                  left: 0,
                  top: 0,
                  width: "100vw",
                  height: "100vh",
                  zIndex: 1000,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "linear-gradient(120deg, rgba(106,130,251,0.10) 0%, rgba(252,92,125,0.10) 100%), rgba(30, 16, 60, 0.25)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div
                  style={{
                    background: "rgba(77, 71, 71, 0.85)",
                    borderRadius: 18,
                    boxShadow:
                      "0 8px 40px 0 rgba(157, 78, 221, 0.18), 0 2px 8px 0 rgba(106, 130, 251, 0.10)",
                    border: "2px solid rgba(157, 78, 221, 0.15)",
                    padding: "2.5rem 2rem 2rem 2rem",
                    minWidth: 340,
                    maxWidth: "95vw",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    position: "relative",
                    backdropFilter: "blur(18px)",
                  }}
                >
                  <h3
                    style={{
                      marginBottom: 18,
                      fontSize: "1.6rem",
                      fontWeight: 700,
                      background:
                        "linear-gradient(90deg, #6a82fb 0%, #fc5c7d 100%)",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                      textShadow: "0 2px 16px #6a82fb33",
                    }}
                  >
                    Export as <span style={{color: '#fc5c7d'}}>PNG</span>
                  </h3>
                  <div style={{ marginBottom: "1rem" }}>
                    <label>
                      <input
                        type="radio"
                        checked={exportPngAllPages}
                        onChange={() => setExportPngAllPages(true)}
                      />
                      Export all pages
                    </label>
                    <br />
                    <label>
                      <input
                        type="radio"
                        checked={!exportPngAllPages}
                        onChange={() => setExportPngAllPages(false)}
                      />
                      Export selected pages:
                    </label>
                    {!exportPngAllPages && (
                      <div
                        style={{
                          marginTop: "0.5rem",
                          maxHeight: 120,
                          overflowY: "auto",
                          border: "1px solid #444",
                          borderRadius: 8,
                          padding: 8,
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        {Array.from({ length: numPages }, (_, i) => i + 1).map(
                          (pageNum) => (
                            <label key={pageNum} style={{ marginRight: 12, minWidth: 90 }}>
                              <input
                                type="checkbox"
                                checked={exportPngSelectedPages.includes(pageNum)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setExportPngSelectedPages((prev) => [
                                      ...prev,
                                      pageNum,
                                    ]);
                                  } else {
                                    setExportPngSelectedPages((prev) =>
                                      prev.filter((p) => p !== pageNum)
                                    );
                                  }
                                }}
                              />
                              Page {pageNum}
                            </label>
                          )
                        )}
                      </div>
                    )}
                  </div>
                  {/* PNG Previews */}
                  <PngPreviewGrid
                    pdfFile={pdfFile}
                    pageNums={exportPngAllPages ? Array.from({length: numPages}, (_, i) => i + 1) : exportPngSelectedPages}
                  />
                  <div
                    style={{
                      display: "flex",
                      gap: 18,
                      justifyContent: "center",
                      width: "100%",
                      marginBottom: 0,
                    }}
                  >
                    <button
                      onClick={handleExportPngConfirm}
                      style={{
                        border: "none",
                        borderRadius: 8,
                        padding: "10px 26px",
                        fontWeight: 700,
                        fontSize: "1.05rem",
                        cursor: "pointer",
                        background:
                          "linear-gradient(90deg, #9d4edd 0%, #c77dff 100%)",
                        color: "#fff",
                        boxShadow: "0 2px 12px #6a82fb22",
                      }}
                      disabled={
                        isExportingPng ||
                        (!exportPngAllPages && exportPngSelectedPages.length === 0)
                      }
                    >
                      {isExportingPng ? "Exporting..." : "Export"}
                    </button>
                    <button
                      onClick={() => setShowExportPngModal(false)}
                      style={{
                        border: "none",
                        borderRadius: 8,
                        padding: "10px 26px",
                        fontWeight: 700,
                        fontSize: "1.05rem",
                        cursor: "pointer",
                        background: "#eee",
                        color: "#3730a3",
                        boxShadow: "0 1px 4px #9d4edd11",
                      }}
                      disabled={isExportingPng}
                    >
                      Cancel
                    </button>
                  </div>
                  {isExportingPng && (
                    <div
                      style={{
                        marginTop: 18,
                        color: "#6c2bd7",
                        fontWeight: 600,
                        fontSize: "1.08rem",
                        textAlign: "center",
                      }}
                    >
                      Exporting PNGs...
                    </div>
                  )}
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
                    if (tool.label === 'Export PNG') handleExportPng();
                    if (tool.label === 'Signature') handleSignatureTool();
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
      {/* Signature upload input (hidden) */}
<input
  type="file"
  accept="image/*"
  ref={signatureInputRef}
  style={{ display: 'none' }}
  onChange={e => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSignatureImage(ev.target.result);
        setShowSignatureModal(true); // Show modal for preview/confirmation
      };
      reader.readAsDataURL(file);
    }
  }}
/>
{showSignatureModal && signatureImage && (
  <div className="editor-modal-bg">
    <div className="editor-modal signature-modal" style={{ minWidth: 320, textAlign: 'center' }}>
      <h3>Preview Signature</h3>
      <img src={signatureImage} alt="Signature Preview" style={{ maxWidth: 220, maxHeight: 120, margin: '1rem auto', display: 'block', border: '2px solid #6a82fb', borderRadius: 8, background: '#fff' }} />
      <div style={{ margin: '1rem 0', color: '#6a82fb', fontWeight: 600 }}>
        Click "Place Signature" and then click on the PDF to position it.
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        <button
          className="editor-modal-btn confirm"
          onClick={() => {
            setIsAddingSignature(true);
            setShowSignatureModal(false);
          }}
        >
          Place Signature
        </button>
        <button
          className="editor-modal-btn cancel"
          onClick={() => {
            setSignatureImage(null);
            setShowSignatureModal(false);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
{isAddingSignature && signatureImage && (
  <div className="signature-hint" style={{ color: '#6a82fb', fontWeight: 600, margin: 8 }}>
    Click on the PDF to place your signature
  </div>
)}
    </div>
  );
}
