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
  const fileInputRef = useRef();

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

  return (
    <div className="editor-bg">
      {/* Modal for PDF upload */}
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

      {/* Editor UI */}
      {!showModal && (
        <>
          <header className="editor-header">
            <span className="editor-title-animated">PDF Editor</span>
          </header>
          <main className="editor-main">
            {/* PDF preview or editing area goes here */}
            {pdfFile ? (
              <div className="pdfjs-preview-wrapper">
                <Document
                  file={pdfFile}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={<div className="pdf-placeholder">Loading PDF...</div>}
                  className="pdfjs-document"
                >
                  <Page pageNumber={pageNumber} className="pdfjs-page" />
                </Document>
                <div className="pdfjs-controls">
                  <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}>Prev</button>
                  <span>Page {pageNumber} of {numPages}</span>
                  <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}>Next</button>
                </div>
              </div>
            ) : (
              <div className="pdf-placeholder">PDF Preview/Editor Area</div>
            )}
          </main>
          {/* Toolbar switch logic */}
          {showEditToolbar ? (
            <EditToolbar onBack={() => setShowEditToolbar(false)} />
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
