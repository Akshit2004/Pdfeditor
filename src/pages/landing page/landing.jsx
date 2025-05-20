import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaFileAlt, 
  FaEdit, 
  FaMagic, 
  FaChevronRight, 
  FaRocket 
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
    </div>
  );
};

export default Landing;
