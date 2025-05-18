import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FaTrashAlt, FaGripVertical } from 'react-icons/fa';
import { PDFDocument } from 'pdf-lib';
import { useLocation } from 'react-router-dom';
import './editor.css';

// Use a direct path to the worker file instead of process.env
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

const PDFEditor = () => {
  const location = useLocation();
  const [pdfFile, setPdfFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [pageOrder, setPageOrder] = useState([]);

  // On mount, set pdfFile from location.state if available
  useEffect(() => {
    if (location.state && location.state.pdfFile) {
      setPdfFile(location.state.pdfFile);
    } else {
      // fallback to localStorage
      const stored = localStorage.getItem('pdfFile');
      if (stored) setPdfFile(stored);
    }
  }, [location.state]);

  // Function to handle document loading
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setIsLoaded(true);
    setPageOrder(Array.from({ length: numPages }, (_, i) => i + 1));
    setCurrentPage(1);
  };

  // Function to handle page change
  const changePage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= (pageOrder.length || numPages)) {
      setCurrentPage(pageNumber);
    }
  };

  // Function to handle file input (fallback if user visits /editor directly)
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      const fileReader = new FileReader();
      fileReader.onload = () => {
        setPdfFile(fileReader.result);
      };
      fileReader.readAsDataURL(file);
    }
  };

  // Zoom functions
  const zoomIn = () => setScale(scale + 0.1);
  const zoomOut = () => setScale(Math.max(0.5, scale - 0.1));
  const resetZoom = () => setScale(1.0);

  // Drag and drop handlers
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(pageOrder);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setPageOrder(reordered);
    // If current page was moved, update currentPage to its new index+1
    const newIndex = reordered.indexOf(pageOrder[currentPage - 1]);
    setCurrentPage(newIndex + 1);
  };

  // Delete page handler
  const handleDeletePage = (index) => {
    if (pageOrder.length <= 1) return; // Don't allow deleting last page
    const newOrder = pageOrder.filter((_, i) => i !== index);
    setPageOrder(newOrder);
    if (currentPage > newOrder.length) {
      setCurrentPage(newOrder.length);
    }
  };

  // Download the new PDF with current page order
  const handleDownload = async () => {
    if (!pdfFile || !pageOrder.length) return;
    const existingPdfBytes = await fetch(pdfFile).then(res => res.arrayBuffer());
    const srcPdf = await PDFDocument.load(existingPdfBytes);
    const newPdf = await PDFDocument.create();
    for (let i = 0; i < pageOrder.length; i++) {
      const [copiedPage] = await newPdf.copyPages(srcPdf, [pageOrder[i] - 1]);
      newPdf.addPage(copiedPage);
    }
    const pdfBytes = await newPdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reordered.pdf';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Render
  return (
    <div className="editor-container">
      {/* Current Page View */}
      <div className="current-page-container">
        {pdfFile && pageOrder.length > 0 ? (
          <Document
            file={pdfFile}
            onLoadSuccess={onDocumentLoadSuccess}
            className="pdf-document"
          >
            <Page 
              pageNumber={pageOrder[currentPage - 1]} 
              scale={scale}
              className="current-page"
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        ) : (
          <div className="current-page">
            <p style={{ textAlign: 'center', paddingTop: '40%' }}>
              No PDF loaded. Please upload a PDF file.
            </p>
            <input 
              type="file" 
              accept="application/pdf" 
              onChange={handleFileChange} 
              style={{ marginTop: 24 }}
            />
          </div>
        )}
      </div>

      {/* Bottom Toolbar */}
      <div className="toolbar">
        <div className="tool-group">
          <button className="tool-btn" onClick={() => changePage(currentPage - 1)} disabled={currentPage <= 1}>
            Previous
          </button>
          <span>
            Page {currentPage} of {pageOrder.length || '--'}
          </span>
          <button className="tool-btn" onClick={() => changePage(currentPage + 1)} disabled={currentPage >= pageOrder.length}>
            Next
          </button>
        </div>
        <div className="tool-group">
          <button className="tool-btn" onClick={zoomIn}>Zoom In</button>
          <button className="tool-btn" onClick={resetZoom}>Reset</button>
          <button className="tool-btn" onClick={zoomOut}>Zoom Out</button>
        </div>
        <div className="tool-group">
          <button className="tool-btn" onClick={handleDownload}>Download</button>
        </div>
      </div>

      {/* Thumbnails Grid with Drag and Drop */}
      {isLoaded && pageOrder.length > 0 && (
        <div className="thumbnails-container">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="thumbnails" direction="horizontal">
              {(provided) => {
                return (
                  <div
                    className="thumbnails-grid"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {pageOrder.map((pageNum, index) => (
                      <Draggable key={pageNum} draggableId={pageNum.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`page-thumbnail${currentPage === index + 1 ? ' active' : ''}`}
                            onClick={() => changePage(index + 1)}
                            style={{
                              ...provided.draggableProps.style,
                              boxShadow: snapshot.isDragging ? '0 0 0 4px #9d4edd55' : undefined,
                            }}
                          >
                            <span {...provided.dragHandleProps} className="thumbnail-drag-handle" title="Drag to reorder">
                              <FaGripVertical />
                            </span>
                            <Document file={pdfFile}>
                              <Page 
                                pageNumber={pageNum} 
                                scale={0.2}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                              />
                            </Document>
                            <div className="thumbnail-number">{index + 1}</div>
                            <button
                              className="thumbnail-delete-btn"
                              title="Delete page"
                              onClick={e => { e.stopPropagation(); handleDeletePage(index); }}
                              disabled={pageOrder.length <= 1}
                            >
                              <FaTrashAlt />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                );
              }}
            </Droppable>
          </DragDropContext>
        </div>
      )}
    </div>
  );
};

export default PDFEditor;

