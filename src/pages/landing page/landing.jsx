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

const Landing = () => {
  const [mergerFiles, setMergerFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const mergePDFs = async () => {
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
      a.download = 'merged-document.pdf';
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
          <div className="badge">Next-Gen PDF Technology</div>
          <h1 className="hero-title">
            Transform Your <span className="gradient-text">Documents</span> Into 
            <span className="gradient-text"> Interactive Experiences</span>
          </h1>
          <p className="hero-subtitle">
            Experience the future of document editing with AI-powered tools that bring your PDFs to life.
            Edit, enhance, and collaborate with unprecedented precision and ease.
          </p>
          <div className="hero-buttons">
            <Link to="/editor" className="primary-button">
              Launch Editor <FaChevronRight className="btn-icon" />
            </Link>
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
              Combine Multiple <span className="gradient-text">PDFs</span> Into One
            </h2>
            <p className="merger-subtitle">
              Easily merge multiple PDF files into a single document. Drag and drop to reorder, 
              then download your combined PDF instantly.
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
                  Click to browse or drag & drop PDF files
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
                    onClick={mergePDFs}
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
              <p>Select multiple PDF files at once</p>
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
    </div>
  );
};

export default Landing;
