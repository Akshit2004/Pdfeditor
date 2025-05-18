import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaFileAlt, 
  FaEdit, 
  FaCloud, 
  FaShieldAlt, 
  FaMagic, 
  FaMobileAlt, 
  FaRocket,
  FaChevronRight 
} from 'react-icons/fa';
import './landing.css';

const Landing = () => {
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

  return (
    <div className="landing">
      {/* Background effects */}
      <div className="bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="shape shape-4"></div>
        <div className="shape shape-5"></div>
      </div>
      
      {/* Navigation */}
      <nav className="nav">
        <div className="nav-logo">
          <span className="logo-text">PDF<span className="highlight">Fusion</span></span>
        </div>
        <div className="nav-links">
          <a href="#features" className="nav-link">Features</a>
          <a href="#how-it-works" className="nav-link">Process</a>
          <a href="#pricing" className="nav-link">Plans</a>
        </div>
        <Link to="/upload" className="cta-button">
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
            <Link to="/upload" className="primary-button">
              Launch Editor <FaChevronRight className="btn-icon" />
            </Link>
            <a href="#features" className="secondary-button">
              Explore Features
            </a>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">500k+</span>
              <span className="stat-label">Users</span>
            </div>
            <div className="stat">
              <span className="stat-number">4.9</span>
              <span className="stat-label">Rating</span>
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

      {/* Feature cards */}
      <section className="features" id="features">
        <div className="section-header">
          <h2 className="section-title">Cutting-Edge Tools</h2>
          <p className="section-subtitle">Reimagine what's possible with our advanced PDF technology</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <FaEdit className="feature-icon" />
            </div>
            <h3 className="feature-title">Smart Editing</h3>
            <p className="feature-text">
              AI-powered text and image editing that preserves document formatting with pixel-perfect accuracy.
            </p>
            <div className="card-hover-effect"></div>
          </div>
          
          <div className="feature-card premium">
            <div className="feature-icon-wrapper">
              <FaFileAlt className="feature-icon" />
            </div>
            <div className="card-badge">Popular</div>
            <h3 className="feature-title">Quantum Conversion</h3>
            <p className="feature-text">
              Convert between 40+ file formats with intelligent formatting preservation and batch processing.
            </p>
            <div className="card-hover-effect"></div>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <FaMagic className="feature-icon" />
            </div>
            <h3 className="feature-title">Neural Annotations</h3>
            <p className="feature-text">
              Voice-to-text annotations, smart highlighting, and context-aware commenting tools.
            </p>
            <div className="card-hover-effect"></div>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <FaCloud className="feature-icon" />
            </div>
            <h3 className="feature-title">Quantum Cloud</h3>
            <p className="feature-text">
              Zero-latency syncing across all devices with advanced versioning and automatic backup.
            </p>
            <div className="card-hover-effect"></div>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <FaShieldAlt className="feature-icon" />
            </div>
            <h3 className="feature-title">Bio-Security</h3>
            <p className="feature-text">
              Biometric protection, zero-knowledge encryption, and blockchain verification for critical documents.
            </p>
            <div className="card-hover-effect"></div>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <FaMobileAlt className="feature-icon" />
            </div>
            <h3 className="feature-title">Omni-Platform</h3>
            <p className="feature-text">
              Seamless experience across every device with native-feeling interfaces and real-time collaboration.
            </p>
            <div className="card-hover-effect"></div>
          </div>
        </div>
      </section>

      {/* Process section */}
      <section className="how-it-works" id="how-it-works">
        <div className="section-header">
          <h2 className="section-title">Three Steps to Perfection</h2>
          <p className="section-subtitle">Experience our streamlined workflow</p>
        </div>
        <div className="process-container">
          <div className="process-line"></div>
          <div className="process-steps">
            <div className="process-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Upload</h3>
                <p>Drag-and-drop or select files from any cloud storage with instant processing.</p>
              </div>
              <div className="step-visual">
                <div className="step-icon-container">
                  <FaCloud className="step-icon" />
                </div>
              </div>
            </div>
            
            <div className="process-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Transform</h3>
                <p>Apply intelligent edits, enhancements, and modifications with precision control.</p>
              </div>
              <div className="step-visual">
                <div className="step-icon-container">
                  <FaMagic className="step-icon" />
                </div>
              </div>
            </div>
            
            <div className="process-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Deploy</h3>
                <p>Share instantly, download in any format, or schedule automated distribution.</p>
              </div>
              <div className="step-visual">
                <div className="step-icon-container">
                  <FaRocket className="step-icon" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="cta-section">
        <div className="cta-container glass-card">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Experience the Future?</h2>
            <p className="cta-text">Join over 500,000 professionals who've revolutionized their document workflow.</p>
            <Link to="/upload" className="primary-button pulse">
              Begin Your Journey <FaChevronRight className="btn-icon" />
            </Link>
          </div>
          <div className="cta-visual">
            <div className="orbital">
              <div className="orbital-circle"></div>
              <div className="orbital-circle"></div>
              <div className="orbital-circle"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-column brand-column">
            <div className="footer-logo">PDF<span className="highlight">Fusion</span></div>
            <p>Redefining document experiences</p>
            <div className="social-links">
              <a href="#" className="social-link"><i className="fab fa-twitter"></i></a>
              <a href="#" className="social-link"><i className="fab fa-linkedin"></i></a>
              <a href="#" className="social-link"><i className="fab fa-instagram"></i></a>
            </div>
          </div>
          <div className="footer-column">
            <h3 className="footer-title">Product</h3>
            <ul className="footer-links">
              <li className="footer-link"><a href="#">Features</a></li>
              <li className="footer-link"><a href="#">Plans</a></li>
              <li className="footer-link"><a href="#">Enterprise</a></li>
              <li className="footer-link"><a href="#">Beta Program</a></li>
            </ul>
          </div>
          <div className="footer-column">
            <h3 className="footer-title">Support</h3>
            <ul className="footer-links">
              <li className="footer-link"><a href="#">Knowledge Base</a></li>
              <li className="footer-link"><a href="#">Video Tutorials</a></li>
              <li className="footer-link"><a href="#">Live Chat</a></li>
              <li className="footer-link"><a href="#">Developer API</a></li>
            </ul>
          </div>
          <div className="footer-column">
            <h3 className="footer-title">Company</h3>
            <ul className="footer-links">
              <li className="footer-link"><a href="#">About Us</a></li>
              <li className="footer-link"><a href="#">Careers</a></li>
              <li className="footer-link"><a href="#">Press Kit</a></li>
              <li className="footer-link"><a href="#">Legal</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} PDFFusion. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
