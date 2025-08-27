import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Send, Eye, EyeOff } from 'lucide-react';

const FeedbackOverlay = () => {
  const [isActive, setIsActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [hoveredElement, setHoveredElement] = useState(null);

  useEffect(() => {
    // Load feedback history from localStorage
    const saved = localStorage.getItem('feedback-history');
    if (saved) {
      setFeedbackHistory(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const handleMouseOver = (e) => {
      if (e.target.closest('.feedback-dialog') || e.target.closest('.feedback-toggle')) return;
      
      const element = e.target;
      const rect = element.getBoundingClientRect();
      
      // Get a descriptive name for the element
      const elementName = getElementDescription(element);
      
      setHoveredElement({
        element: element,
        name: elementName,
        rect: rect
      });
    };

    const handleClick = (e) => {
      if (e.target.closest('.feedback-dialog') || e.target.closest('.feedback-toggle')) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const element = e.target;
      const elementName = getElementDescription(element);
      
      setSelectedElement({
        name: elementName,
        html: element.outerHTML.substring(0, 200),
        path: getElementPath(element)
      });
      setShowDialog(true);
      setIsActive(false);
    };

    const handleMouseOut = () => {
      setHoveredElement(null);
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('click', handleClick, true);
    };
  }, [isActive]);

  const getElementDescription = (element) => {
    // Try to get a meaningful description of the element
    let description = '';
    
    // Check for common identifiers
    if (element.id) {
      description = `#${element.id}`;
    } else if (element.className && typeof element.className === 'string') {
      const mainClass = element.className.split(' ')[0];
      description = `.${mainClass}`;
    }
    
    // Add text content if available
    const text = element.textContent?.trim().substring(0, 30);
    if (text && text.length > 0 && !element.children.length) {
      description += description ? ` "${text}"` : `"${text}"`;
    }
    
    // Add element type
    const tag = element.tagName?.toLowerCase();
    if (tag) {
      description = `${tag}${description}`;
    }
    
    // Special cases for known components
    if (element.closest('.bg-gray-800') && element.textContent?.includes('Stats')) {
      description = 'Stats Bar';
    } else if (element.closest('.bg-gray-800') && element.textContent?.includes('Quick Actions')) {
      description = 'Quick Actions Panel';
    } else if (element.closest('.bg-gray-800') && element.textContent?.includes('Pipeline')) {
      description = 'Invoice Pipeline';
    } else if (element.closest('.dashboard')) {
      description = 'Dashboard Component';
    }
    
    return description || 'Unknown Element';
  };

  const getElementPath = (element) => {
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className && typeof current.className === 'string') {
        selector += `.${current.className.split(' ')[0]}`;
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  };

  const handleSubmitFeedback = () => {
    if (!feedbackText.trim()) return;
    
    const feedbackItem = {
      element: selectedElement,
      feedback: feedbackText,
      timestamp: new Date().toISOString(),
      id: Date.now()
    };
    
    const newHistory = [...feedbackHistory, feedbackItem];
    setFeedbackHistory(newHistory);
    localStorage.setItem('feedback-history', JSON.stringify(newHistory));
    
    // Generate formatted feedback for copying
    const formattedFeedback = generateFormattedFeedback(feedbackItem);
    copyToClipboard(formattedFeedback);
    
    // Reset dialog
    setFeedbackText('');
    setShowDialog(false);
    setSelectedElement(null);
    
    // Show success message
    showToast('Feedback copied to clipboard!');
  };

  const generateFormattedFeedback = (item) => {
    return `## Feedback for Invoice Generator

### Element: ${item.element.name}
**Path:** ${item.element.path}

### Requested Changes:
${item.feedback}

### Context:
- Timestamp: ${new Date(item.timestamp).toLocaleString()}
- Component: Invoice Generator Dashboard
`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const showToast = (message) => {
    const toast = document.createElement('div');
    toast.className = 'feedback-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const exportAllFeedback = () => {
    const allFeedback = feedbackHistory.map((item, index) => 
      `### Feedback #${index + 1}
Element: ${item.element.name}
Feedback: ${item.feedback}
Time: ${new Date(item.timestamp).toLocaleString()}
---`
    ).join('\n\n');

    const fullExport = `# Invoice Generator - All Feedback

Generated: ${new Date().toLocaleString()}

${allFeedback}`;

    copyToClipboard(fullExport);
    showToast('All feedback exported to clipboard!');
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        className="feedback-toggle"
        onClick={() => setIsActive(!isActive)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: isActive 
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          transition: 'all 0.3s ease'
        }}
      >
        {isActive ? <EyeOff size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Selection Mode Indicator */}
      {isActive && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '30px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
          zIndex: 9999,
          fontWeight: '600',
          fontSize: '14px'
        }}>
          Click any element to add feedback
        </div>
      )}

      {/* Hover Overlay */}
      {isActive && hoveredElement && (
        <div style={{
          position: 'fixed',
          top: hoveredElement.rect.top,
          left: hoveredElement.rect.left,
          width: hoveredElement.rect.width,
          height: hoveredElement.rect.height,
          border: '2px dashed #667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          pointerEvents: 'none',
          zIndex: 9998,
          transition: 'all 0.1s ease'
        }}>
          <div style={{
            position: 'absolute',
            top: '-25px',
            left: '0',
            background: '#667eea',
            color: 'white',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}>
            {hoveredElement.name}
          </div>
        </div>
      )}

      {/* Feedback Dialog */}
      {showDialog && (
        <div className="feedback-dialog" style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                margin: '0',
                fontSize: '24px',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Add Feedback
              </h2>
              <button
                onClick={() => setShowDialog(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px'
                }}
              >
                <X size={24} color="#666" />
              </button>
            </div>

            <div style={{
              background: '#f8f9fa',
              padding: '15px',
              borderRadius: '10px',
              marginBottom: '20px'
            }}>
              <p style={{
                margin: '0 0 5px 0',
                fontSize: '12px',
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Selected Element
              </p>
              <p style={{
                margin: '0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#333'
              }}>
                {selectedElement?.name}
              </p>
            </div>

            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Describe what you'd like to change about this element..."
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '15px',
                border: '2px solid #e0e0e0',
                borderRadius: '10px',
                fontSize: '16px',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: '20px'
              }}
              autoFocus
            />

            <div style={{
              display: 'flex',
              gap: '10px'
            }}>
              <button
                onClick={handleSubmitFeedback}
                disabled={!feedbackText.trim()}
                style={{
                  flex: '1',
                  padding: '12px 24px',
                  background: feedbackText.trim() 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: feedbackText.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Send size={18} />
                Submit & Copy
              </button>
              <button
                onClick={() => setShowDialog(false)}
                style={{
                  padding: '12px 24px',
                  background: '#e0e0e0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>

            {/* Feedback History */}
            {feedbackHistory.length > 0 && (
              <div style={{
                marginTop: '30px',
                paddingTop: '20px',
                borderTop: '1px solid #e0e0e0'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <h3 style={{
                    margin: '0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#666'
                  }}>
                    Recent Feedback ({feedbackHistory.length})
                  </h3>
                  <button
                    onClick={exportAllFeedback}
                    style={{
                      padding: '6px 12px',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Export All
                  </button>
                </div>
                <div style={{
                  maxHeight: '150px',
                  overflow: 'auto'
                }}>
                  {feedbackHistory.slice(-3).reverse().map((item) => (
                    <div key={item.id} style={{
                      background: '#f8f9fa',
                      padding: '10px',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      fontSize: '14px'
                    }}>
                      <strong>{item.element.name}:</strong> {item.feedback.substring(0, 50)}...
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOut {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(20px);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};

export default FeedbackOverlay;