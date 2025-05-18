import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

import React, { useState, useRef } from 'react';
import { Document, Page } from 'react-pdf';
import { FiUpload, FiFile, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import './UploadPage.css';

const UploadPage = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      const fileReader = new FileReader();
      fileReader.onload = () => {
        setPdfFile(fileReader.result);
        setPageNumber(1);
      };
      fileReader.readAsDataURL(file);
    } else {
      alert('Please select a valid PDF file');
      setPdfFile(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      const fileReader = new FileReader();
      fileReader.onload = () => {
        setPdfFile(fileReader.result);
        setPageNumber(1);
      };
      fileReader.readAsDataURL(file);
    } else {
      alert('Please drop a valid PDF file');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const goToPrevPage = () => {
    setPageNumber(pageNumber - 1 <= 1 ? 1 : pageNumber - 1);
  };

  const goToNextPage = () => {
    setPageNumber(pageNumber + 1 >= numPages ? numPages : pageNumber + 1);
  };

  const handleClearFile = () => {
    setPdfFile(null);
    setNumPages(null);
    setPageNumber(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const goToEditor = () => {
    navigate('/editor', { state: { pdfFile } });
  };

  return (
    <div className="upload-page">
      {/* Background effects */}
      <div className="bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>      </div>
      
      <h1>PDF<span style={{ color: "var(--primary-color)" }}>Fusion</span> Uploader</h1>
      
      {!pdfFile ? (
        <div 
          className={`upload-area ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <FiUpload className="upload-icon" />
          <p>Drag & Drop your PDF here or</p>
          <button className="upload-btn" onClick={triggerFileInput}>
            Choose File
          </button>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange} 
            className="file-input" 
            accept="application/pdf" 
          />
        </div>
      ) : (
        <div className="pdf-viewer-container">
          {/* Close button for preview */}
          <button className="clear-btn" style={{position: 'absolute', top: 20, right: 20, zIndex: 2}} onClick={handleClearFile} title="Close Preview">
            <FiX size={24} />
          </button>
          <div className="pdf-controls">
            <div className="file-info">
              <FiFile />
              <span>{fileInputRef.current?.files[0]?.name || "Uploaded PDF"}</span>
            </div>
            <div className="pdf-actions">
              <button 
                className="nav-btn" 
                onClick={goToPrevPage} 
                disabled={pageNumber <= 1}
              >
                <FiChevronLeft />
              </button>
              <span className="page-info">
                Page {pageNumber} of {numPages}
              </span>
              <button 
                className="nav-btn" 
                onClick={goToNextPage} 
                disabled={pageNumber >= numPages}
              >
                <FiChevronRight />
              </button>
              {/* Add Go to Editor button */}
              <button className="upload-btn" style={{marginLeft: '1rem'}} onClick={goToEditor}>
                Edit PDF
              </button>
            </div>
          </div>
          <div className="pdf-document-container">
            <Document
              file={pdfFile}
              onLoadSuccess={onDocumentLoadSuccess}
              className="pdf-document"
            >
              <Page 
                pageNumber={pageNumber} 
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="pdf-page"
              />
            </Document>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPage;