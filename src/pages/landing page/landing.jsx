import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaFileAlt, 
  FaEdit, 
  FaMagic, 
  FaChevronRight, 
  FaRocket,
  FaPlus,
  FaDownload,
  FaTrash,
  FaClone
} from 'react-icons/fa';
import './landing.css';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

const Landing = () => {
  const [mergerFiles, setMergerFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFilenameModal, setShowFilenameModal] = useState(false);
  const [downloadFilename, setDownloadFilename] = useState('merged-document.pdf');
  const [extractedText, setExtractedText] = useState('');

  useEffect(() => {
    // Add parallax effect on scroll
    const handleScroll = () => {
      const parallaxElements = document.querySelectorAll('.parallax');
      parallaxElements.forEach(element => {
        const speed = element.getAttribute('data-speed');
        const yPos = -(window.scrollY * speed);
        element.style.transform = `translateY(${yPos}px)`;
      });
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
    ];
    const validFiles = files.filter(file => allowedTypes.includes(file.type));
    setMergerFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setMergerFiles(prev => prev.filter((_, i) => i !== index));
  };

  const moveFile = (fromIndex, toIndex) => {
    setMergerFiles(prev => {
      const newFiles = [...prev];
      const [movedFile] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, movedFile);
      return newFiles;
    });
  };

  const handleMergeClick = () => {
    setDownloadFilename('merged-document.pdf');
    setShowFilenameModal(true);
  };

  const handleFilenameChange = (e) => {
    setDownloadFilename(e.target.value);
  };

  const handleFilenameConfirm = () => {
    setShowFilenameModal(false);
    mergePDFs(downloadFilename);
  };

  const mergePDFs = async (filename = 'merged-document.pdf') => {
    if (mergerFiles.length < 2) return;
    setIsProcessing(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const mergedPdf = await PDFDocument.create();
      for (const file of mergerFiles) {
        if (file.type === 'application/pdf') {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await PDFDocument.load(arrayBuffer);
          const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          pages.forEach(page => mergedPdf.addPage(page));
        } else if (
          file.type === 'image/png' ||
          file.type === 'image/jpeg' ||
          file.type === 'image/jpg'
        ) {
          const imageBytes = await file.arrayBuffer();
          let embeddedImage, dims;
          if (file.type === 'image/png') {
            embeddedImage = await mergedPdf.embedPng(imageBytes);
          } else {
            embeddedImage = await mergedPdf.embedJpg(imageBytes);
          }
          dims = embeddedImage.scale(1);
          const page = mergedPdf.addPage([dims.width, dims.height]);
          page.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: dims.width,
            height: dims.height,
          });
        }
      }
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.endsWith('.pdf') ? filename : filename + '.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMergerFiles([]);
    } catch (error) {
      console.error('Error merging PDFs/images:', error);
      alert('Error merging PDFs/images. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="landing">      {/* Background effects */}
      <div className="bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="shape shape-4"></div>
        <div className="shape shape-5"></div>
        <div className="shape shape-6"></div>
        <div className="shape shape-7"></div>
      </div>
      
      {/* Navigation */}
      <nav className="nav">
        <div className="nav-logo">
          <span className="logo-text">PDF<span className="highlight">Fusion</span></span>
        </div>
        <Link to="/editor" className="cta-button">
          Try Now <FaRocket className="btn-icon" />
        </Link>
      </nav>
      
      {/* Hero section */}
      <section className="hero">
        <div className="hero-content">
          <div className="badge">Modern PDF Tools</div>
          <h1 className="hero-title">
            Transform Your <span className="gradient-text">Documents</span> Into
            <span className="gradient-text"> Interactive Experiences</span>
          </h1>
          <p className="hero-subtitle">
            Experience the future of document editing with powerful, user-friendly tools that bring your PDFs to life.
            Edit, enhance, and collaborate with ease and flexibility.
          </p>
          <div className="hero-buttons">
            <Link to="/editor" className="primary-button">
              Launch Editor <FaChevronRight className="btn-icon" />
            </Link>
          </div>
          <div className="hero-hint">
            <span>Want to merge PDFs? Scroll down to use our PDF Merger Tool!</span>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">100%</span>
              <span className="stat-label">Free to Use</span>
            </div>
            <div className="stat">
              <span className="stat-number">Web-Based</span>
              <span className="stat-label">No Downloads</span>
            </div>
            <div className="stat">
              <span className="stat-number">99.9%</span>
              <span className="stat-label">Uptime</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-image-container">
            <div className="glow-effect"></div>
            <img 
              src="https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=800&q=80" 
              alt="PDF editing interface" 
              className="hero-image"
            />
            <div className="floating-element elem-1 parallax" data-speed="0.05">
              <FaEdit />
            </div>
            <div className="floating-element elem-2 parallax" data-speed="0.08">
              <FaFileAlt />
            </div>
            <div className="floating-element elem-3 parallax" data-speed="0.06">
              <FaMagic />
            </div>
          </div>
        </div>
      </section>

      {/* PDF Merger Section */}
      <section className="merger-section">
        <div className="merger-container">
          <div className="merger-header">
            <div className="badge merger-badge">PDF Merger Tool</div>
            <h2 className="merger-title">
              Combine Multiple <span className="gradient-text">PDFs & Images</span> Into One PDF
            </h2>
            <p className="merger-subtitle">
              Easily merge multiple PDF files <b>and images (JPG, PNG)</b> into a single document. Drag and drop to reorder, then download your combined PDF instantly.
            </p>
          </div>
          
          <div className="merger-workspace">
            <div className="merger-upload-area">
              <input
                type="file"
                multiple
                accept="application/pdf,image/png,image/jpeg,image/jpg"
                onChange={handleFileSelect}
                className="merger-file-input"
                id="merger-file-input"
              />
              <label htmlFor="merger-file-input" className="merger-upload-label">
                <FaPlus className="merger-upload-icon" />
                <span className="merger-upload-text">
                  {mergerFiles.length === 0 ? 'Select PDF Files' : 'Add More PDFs'}
                </span>
                <span className="merger-upload-hint">
                  Click to browse or drag & drop PDF/Images files
                </span>
              </label>
            </div>
            
            {mergerFiles.length > 0 && (
              <div className="merger-files-list">
                <h3 className="merger-files-title">
                  <FaClone className="merger-files-icon" />
                  Selected Files ({mergerFiles.length})
                </h3>
                <div className="merger-files-container">
                  {mergerFiles.map((file, index) => (
                    <div key={index} className="merger-file-item">
                      <div className="merger-file-info">
                        <FaFileAlt className="merger-file-icon" />
                        <div className="merger-file-details">
                          <span className="merger-file-name">{file.name}</span>
                          <span className="merger-file-size">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                      <div className="merger-file-actions">
                        <button
                          className="merger-action-btn move-up"
                          onClick={() => moveFile(index, Math.max(0, index - 1))}
                          disabled={index === 0}
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          className="merger-action-btn move-down"
                          onClick={() => moveFile(index, Math.min(mergerFiles.length - 1, index + 1))}
                          disabled={index === mergerFiles.length - 1}
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          className="merger-action-btn remove"
                          onClick={() => removeFile(index)}
                          title="Remove file"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="merger-actions">
                  <button
                    className="merger-clear-btn"
                    onClick={() => setMergerFiles([])}
                    disabled={isProcessing}
                  >
                    Clear All
                  </button>
                  <button
                    className="merger-merge-btn"
                    onClick={handleMergeClick}
                    disabled={mergerFiles.length < 2 || isProcessing}
                  >
                    {isProcessing ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <FaDownload className="btn-icon" />
                        Merge & Download
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="merger-features">
            <div className="merger-feature">
              <div className="merger-feature-icon">
                <FaPlus />
              </div>
              <h4>Easy Upload</h4>
              <p>Select multiple files at once</p>
            </div>            <div className="merger-feature">
              <div className="merger-feature-icon">
                <FaEdit />
              </div>
              <h4>Fast Processing</h4>
              <p>Lightning-fast PDF merging and processing</p>
            </div>
            <div className="merger-feature">
              <div className="merger-feature-icon">
                <FaDownload />
              </div>
              <h4>Instant Download</h4>
              <p>Get your merged PDF immediately</p>
            </div>
          </div>
        </div>
      </section>

      {/* PDF Text Extraction Section */}
      <section className="extract-section">
        <div className="extract-container">
          <div className="extract-header">
            <div className="badge extract-badge">PDF Text Extractor</div>
            <h2 className="extract-title">
              Extract <span className="gradient-text">Text, Symbols & Tables</span> from Your PDF
            </h2>
            <p className="extract-subtitle">
              Upload a PDF to instantly extract all its text content, including special symbols, paragraphs, and tables. <br />
              <b>How to use:</b> Click the button below to upload your PDF. The extracted text will appear in the box below, preserving as much formatting as possible.
            </p>
          </div>
          <div className="extract-workspace">
            <input
              type="file"
              accept="application/pdf"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                setExtractedText('Extracting...');
                try {
                  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
                  const arrayBuffer = await file.arrayBuffer();
                  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                  let text = '';
                  for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    let lastY, lastItem, pageText = '';
                    content.items.forEach((item) => {
                      if (lastY === item.transform[5] || !lastY) {
                        pageText += item.str;
                      } else {
                        pageText += '\n' + item.str;
                      }
                      lastY = item.transform[5];
                      lastItem = item;
                    });
                    text += pageText + '\n\n';
                  }
                  setExtractedText(text.trim());
                } catch (err) {
                  setExtractedText('Failed to extract text.');
                }
              }}
              className="extract-file-input"
              id="extract-file-input"
            />
            <label htmlFor="extract-file-input" className="extract-upload-label">
              <FaPlus className="extract-upload-icon" />
              <span className="extract-upload-text">Upload PDF for Extraction</span>
            </label>
            <div className="extract-result-block">
              <textarea
                className="extract-text-block"
                value={extractedText}
                onChange={e => setExtractedText(e.target.value)}
                rows={Math.max(10, extractedText.split('\n').length + 2)}
                style={{ width: '100%', resize: 'vertical', background: 'transparent', border: 'none', outline: 'none', color: '#f5f6fa', fontFamily: 'Fira Mono, Consolas, Menlo, monospace', fontSize: '1.08rem', lineHeight: '1.7', letterSpacing: '0.01em' }}
              />
            </div>
          </div>
        </div>
      </section>

      {showFilenameModal && (
        <div className="filename-modal-overlay">
          <div className="filename-modal">
            <h3>Set Download File Name</h3>
            <input
              type="text"
              value={downloadFilename}
              onChange={handleFilenameChange}
              className="filename-input"
              disabled={isProcessing}
              maxLength={64}
              autoFocus
            />
            <div className="filename-modal-actions">
              <button onClick={() => setShowFilenameModal(false)} disabled={isProcessing}>Cancel</button>
              <button onClick={handleFilenameConfirm} disabled={isProcessing || !downloadFilename.trim()}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
