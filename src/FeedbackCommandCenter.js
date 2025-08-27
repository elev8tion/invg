import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Eye, 
  EyeOff, 
  Copy, 
  Trash2, 
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Star,
  Zap,
  Palette,
  Layout,
  Plus,
  Check,
  Archive
} from 'lucide-react';

const FeedbackCommandCenter = () => {
  const [isActive, setIsActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('general');
  const [feedbackQueue, setFeedbackQueue] = useState([]);
  const [hoveredElement, setHoveredElement] = useState(null);
  const [showCommandCenter, setShowCommandCenter] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [sessionId] = useState(Date.now());

  // Load feedback queue from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('feedback-queue');
    if (saved) {
      setFeedbackQueue(JSON.parse(saved));
    }
  }, []);

  // Save feedback queue to localStorage
  useEffect(() => {
    if (feedbackQueue.length > 0) {
      localStorage.setItem('feedback-queue', JSON.stringify(feedbackQueue));
    }
  }, [feedbackQueue]);

  // Element selection logic
  useEffect(() => {
    if (!isActive) return;

    const handleMouseOver = (e) => {
      if (e.target.closest('.feedback-dialog') || 
          e.target.closest('.feedback-toggle') ||
          e.target.closest('.feedback-command-center')) return;
      
      const element = e.target;
      const rect = element.getBoundingClientRect();
      
      // Get a short description for the hover tooltip
      const shortDesc = getShortElementDescription(element);
      
      setHoveredElement({
        element: element,
        name: shortDesc,
        rect: rect
      });
    };

    const handleClick = (e) => {
      if (e.target.closest('.feedback-dialog') || 
          e.target.closest('.feedback-toggle') ||
          e.target.closest('.feedback-command-center')) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const element = e.target;
      
      setSelectedElement({
        name: getElementDescription(element),
        html: element.outerHTML.substring(0, 200),
        path: getElementPath(element),
        screenshot: captureElementState(element)
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

  // Helper functions
  const getElementDescription = (element) => {
    let description = '';
    const tag = element.tagName?.toLowerCase();
    
    // Start with tag
    if (tag) {
      description = tag;
    }
    
    // Add ID if present
    if (element.id) {
      description += `#${element.id}`;
    }
    
    // Add ALL classes to be more specific
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(' ').filter(c => c);
      if (classes.length > 0) {
        description += '.' + classes.join('.');
      }
    }
    
    // Add the full text content for better identification
    const text = element.textContent?.trim();
    if (text && text.length > 0) {
      // For buttons and links, show the full text
      if (tag === 'button' || tag === 'a' || !element.children.length) {
        const displayText = text.length > 50 ? text.substring(0, 50) + '...' : text;
        description += ` "${displayText}"`;
      }
    }
    
    // Add structural context
    const structuralContext = getStructuralContext(element);
    if (structuralContext) {
      description += ` (${structuralContext})`;
    }
    
    return description || 'Unknown Element';
  };

  const getStructuralContext = (element) => {
    const contexts = [];
    
    // Find semantic container
    const section = element.closest('section, article, header, footer, aside, nav, main');
    if (section) {
      const sectionName = section.tagName.toLowerCase();
      const sectionLabel = section.getAttribute('aria-label') || 
                          section.querySelector('h1, h2, h3, h4')?.textContent?.trim();
      if (sectionLabel) {
        contexts.push(`in ${sectionLabel}`);
      } else {
        contexts.push(`in ${sectionName}`);
      }
    }
    
    // Find position among siblings
    const parent = element.parentElement;
    if (parent) {
      const allSiblings = Array.from(parent.children);
      const sameTags = allSiblings.filter(child => child.tagName === element.tagName);
      
      if (sameTags.length > 1) {
        const position = sameTags.indexOf(element) + 1;
        contexts.push(`${position}/${sameTags.length} ${element.tagName.toLowerCase()}`);
        
        // Add relative context to nearby elements
        if (position > 1) {
          const prevSibling = sameTags[position - 2];
          const prevText = prevSibling.textContent?.trim().substring(0, 20);
          if (prevText) {
            contexts.push(`after "${prevText}"`);
          }
        }
      }
    }
    
    // Find closest heading or label
    const closestHeading = findClosestHeading(element);
    if (closestHeading) {
      contexts.push(`under "${closestHeading}"`);
    }
    
    return contexts.join(', ');
  };

  const findClosestHeading = (element) => {
    // Look for preceding heading sibling
    let current = element.parentElement;
    while (current) {
      const headings = Array.from(current.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]'));
      for (const heading of headings) {
        // Check if heading comes before our element
        if (heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) {
          return heading.textContent?.trim().substring(0, 30);
        }
      }
      current = current.parentElement;
    }
    return null;
  };

  const getShortElementDescription = (element) => {
    const tag = element.tagName?.toLowerCase();
    const text = element.textContent?.trim();
    
    // For hover, show a simpler description
    let desc = tag || 'element';
    
    // Add ID if present
    if (element.id) {
      desc += `#${element.id}`;
    }
    
    // Add main class
    if (element.className && typeof element.className === 'string') {
      const firstClass = element.className.trim().split(' ')[0];
      if (firstClass) {
        desc += `.${firstClass}`;
      }
    }
    
    // Add text for buttons and links
    if ((tag === 'button' || tag === 'a') && text) {
      const shortText = text.length > 20 ? text.substring(0, 20) + '...' : text;
      desc += `: "${shortText}"`;
    }
    
    return desc;
  };

  const getElementPath = (element) => {
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      // Add ID if present
      if (current.id) {
        selector += `#${current.id}`;
      }
      
      // Add all classes for better specificity
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(' ').filter(c => c);
        if (classes.length > 0) {
          // Include more classes for uniqueness
          const importantClasses = classes.slice(0, 3).join('.');
          if (importantClasses) {
            selector += `.${importantClasses}`;
          }
        }
      }
      
      // Add nth-child if there are multiple similar elements
      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children);
        const sameTagSiblings = siblings.filter(s => s.tagName === current.tagName);
        if (sameTagSiblings.length > 1) {
          const index = sameTagSiblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  };

  const captureElementState = (element) => {
    const rect = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);
    
    return {
      // Structural information (reliable)
      structure: {
        context: getStructuralContext(element),
        tagName: element.tagName,
        id: element.id || null,
        classes: element.className || null,
        parentTag: element.parentElement?.tagName || null,
        childCount: element.children.length,
        siblingIndex: Array.from(element.parentElement?.children || []).indexOf(element)
      },
      // Content (most reliable identifier)
      content: {
        text: element.textContent?.trim().substring(0, 100),
        ariaLabel: element.getAttribute('aria-label'),
        title: element.getAttribute('title'),
        placeholder: element.getAttribute('placeholder'),
        value: element.value || null
      },
      // Visual info (supplementary - may change with viewport)
      visualContext: {
        note: 'Visual position at time of feedback - may vary with screen size',
        dimensions: {
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        viewportPosition: {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight
        }
      },
      // Styles (supplementary)
      styles: {
        display: styles.display,
        visibility: styles.visibility,
        color: styles.color,
        backgroundColor: styles.backgroundColor,
        fontSize: styles.fontSize
      }
    };
  };

  // Add feedback to queue
  const addToQueue = () => {
    if (!feedbackText.trim()) return;
    
    const feedbackItem = {
      id: Date.now(),
      element: selectedElement,
      feedback: feedbackText,
      priority: priority,
      category: category,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      status: 'pending'
    };
    
    setFeedbackQueue(prev => [...prev, feedbackItem]);
    
    // Reset dialog
    setFeedbackText('');
    setPriority('medium');
    setCategory('general');
    setShowDialog(false);
    setSelectedElement(null);
    
    // Show command center
    setShowCommandCenter(true);
    
    showToast('Feedback added to queue!');
  };

  // Generate formatted export
  const generateExport = () => {
    const grouped = groupFeedbackByCategory();
    const priorityOrder = ['high', 'medium', 'low'];
    
    let output = `## Feedback Summary for ${window.location.hostname}
Generated: ${new Date().toLocaleString()}
Session ID: ${sessionId}
Total Items: ${feedbackQueue.length}

`;

    // Add high priority section first
    const highPriorityItems = feedbackQueue.filter(item => item.priority === 'high');
    if (highPriorityItems.length > 0) {
      output += `### 🔴 High Priority (${highPriorityItems.length} items)\n`;
      highPriorityItems.forEach((item, index) => {
        output += `${index + 1}. **${item.element.name}** - ${item.feedback}\n`;
      });
      output += '\n';
    }

    // Add categorized feedback
    Object.entries(grouped).forEach(([category, items]) => {
      if (items.some(item => item.priority !== 'high')) {
        const categoryIcon = getCategoryIcon(category);
        const nonHighItems = items.filter(item => item.priority !== 'high');
        output += `### ${categoryIcon} ${formatCategoryName(category)} (${nonHighItems.length} items)\n`;
        nonHighItems.forEach((item, index) => {
          const priorityEmoji = item.priority === 'medium' ? '🟡' : '🟢';
          output += `${index + 1}. ${priorityEmoji} **${item.element.name}** - ${item.feedback}\n`;
        });
        output += '\n';
      }
    });

    // Add technical details
    output += `### Technical Details\n`;
    output += '```json\n';
    output += JSON.stringify(
      feedbackQueue.map(item => ({
        element: {
          selector: item.element.path,
          description: item.element.name,
          structure: item.element.screenshot?.structure?.context || 'Unknown context',
          content: item.element.screenshot?.content?.text || '',
          visualNote: 'Position data captured at feedback time - may vary with viewport changes'
        },
        feedback: item.feedback,
        priority: item.priority,
        category: item.category
      })),
      null,
      2
    );
    output += '\n```\n';

    return output;
  };

  // Group feedback by category
  const groupFeedbackByCategory = () => {
    return feedbackQueue.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});
  };

  // Category helpers
  const getCategoryIcon = (category) => {
    const icons = {
      'style': '🎨',
      'layout': '📐',
      'functionality': '⚡',
      'content': '📝',
      'performance': '🚀',
      'accessibility': '♿',
      'general': '📌'
    };
    return icons[category] || '📌';
  };

  const formatCategoryName = (category) => {
    return category.charAt(0).toUpperCase() + category.slice(1) + ' Changes';
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    const output = generateExport();
    navigator.clipboard.writeText(output).then(() => {
      showToast('All feedback copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  // Clear queue
  const clearQueue = () => {
    if (window.confirm('Clear all feedback? This cannot be undone.')) {
      setFeedbackQueue([]);
      localStorage.removeItem('feedback-queue');
      setShowCommandCenter(false);
      showToast('Feedback queue cleared');
    }
  };

  // Remove single item
  const removeItem = (id) => {
    setFeedbackQueue(prev => prev.filter(item => item.id !== id));
  };

  // Update item status
  const updateItemStatus = (id, status) => {
    setFeedbackQueue(prev => prev.map(item => 
      item.id === id ? { ...item, status } : item
    ));
  };

  // Show toast notification
  const showToast = (message) => {
    const toast = document.createElement('div');
    toast.className = 'feedback-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.3);
      z-index: 10001;
      animation: slideInUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOutDown 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <>
      {/* Main Toggle Button */}
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

      {/* Queue Counter Badge */}
      {feedbackQueue.length > 0 && !showCommandCenter && (
        <button
          onClick={() => setShowCommandCenter(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '90px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '25px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 9999,
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          <Archive size={18} />
          {feedbackQueue.length} Feedback Items
        </button>
      )}

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

            {/* Priority Selection */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                fontSize: '12px',
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
                display: 'block'
              }}>
                Priority
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['high', 'medium', 'low'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: `2px solid ${priority === p ? getPriorityColor(p) : '#e0e0e0'}`,
                      background: priority === p ? `${getPriorityColor(p)}20` : 'white',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: priority === p ? getPriorityColor(p) : '#666',
                      fontWeight: priority === p ? '600' : '400',
                      textTransform: 'capitalize',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {p === 'high' ? '🔴' : p === 'medium' ? '🟡' : '🟢'} {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Selection */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                fontSize: '12px',
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
                display: 'block'
              }}>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <option value="general">General</option>
                <option value="style">Style & Colors</option>
                <option value="layout">Layout & Spacing</option>
                <option value="functionality">Functionality</option>
                <option value="content">Content & Text</option>
                <option value="performance">Performance</option>
                <option value="accessibility">Accessibility</option>
              </select>
            </div>

            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Describe what you'd like to change about this element..."
              style={{
                width: '100%',
                minHeight: '120px',
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
                onClick={addToQueue}
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
                <Plus size={18} />
                Add to Queue
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
          </div>
        </div>
      )}

      {/* Command Center */}
      {showCommandCenter && (
        <div className="feedback-command-center" style={{
          position: 'fixed',
          top: '0',
          right: '0',
          width: '400px',
          height: '100vh',
          background: 'white',
          boxShadow: '-5px 0 20px rgba(0,0,0,0.1)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          transform: showCommandCenter ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease'
        }}>
          {/* Header */}
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #e0e0e0',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <h2 style={{
                margin: '0',
                fontSize: '20px',
                fontWeight: '700'
              }}>
                Feedback Command Center
              </h2>
              <button
                onClick={() => setShowCommandCenter(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px',
                  color: 'white'
                }}
              >
                <X size={20} />
              </button>
            </div>
            <p style={{
              margin: '0',
              fontSize: '14px',
              opacity: '0.9'
            }}>
              {feedbackQueue.length} items ready to send
            </p>
          </div>

          {/* Queue List */}
          <div style={{
            flex: '1',
            overflow: 'auto',
            padding: '20px'
          }}>
            {feedbackQueue.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#999'
              }}>
                <MessageCircle size={48} style={{ marginBottom: '10px', opacity: 0.5 }} />
                <p>No feedback in queue</p>
                <p style={{ fontSize: '14px' }}>Click elements to add feedback</p>
              </div>
            ) : (
              Object.entries(groupFeedbackByCategory()).map(([category, items]) => (
                <div key={category} style={{ marginBottom: '20px' }}>
                  <button
                    onClick={() => setCollapsedCategories(prev => ({
                      ...prev,
                      [category]: !prev[category]
                    }))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0',
                      marginBottom: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#333',
                      width: '100%',
                      textAlign: 'left'
                    }}
                  >
                    {collapsedCategories[category] ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    {getCategoryIcon(category)} {formatCategoryName(category)}
                    <span style={{
                      marginLeft: 'auto',
                      background: '#f3f4f6',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {items.length}
                    </span>
                  </button>
                  
                  {!collapsedCategories[category] && items.map(item => (
                    <div key={item.id} style={{
                      background: '#f8f9fa',
                      padding: '12px',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      borderLeft: `3px solid ${getPriorityColor(item.priority)}`
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '12px',
                            color: '#666',
                            marginBottom: '4px'
                          }}>
                            {item.element.name}
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: '#333'
                          }}>
                            {item.feedback}
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: '#999',
                            transition: 'color 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.target.style.color = '#999'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      {item.status === 'completed' && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          color: '#10b981',
                          marginTop: '4px'
                        }}>
                          <Check size={14} />
                          Completed
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Action Buttons */}
          {feedbackQueue.length > 0 && (
            <div style={{
              padding: '20px',
              borderTop: '1px solid #e0e0e0',
              background: '#f8f9fa'
            }}>
              <button
                onClick={copyToClipboard}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '10px'
                }}
              >
                <Copy size={18} />
                Copy All to Clipboard
              </button>
              <button
                onClick={clearQueue}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'white',
                  color: '#ef4444',
                  border: '1px solid #ef4444',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Trash2 size={18} />
                Clear All
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideInUp {
          from {
            transform: translate(-50%, 20px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        
        @keyframes slideOutDown {
          from {
            transform: translate(-50%, 0);
            opacity: 1;
          }
          to {
            transform: translate(-50%, 20px);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};

export default FeedbackCommandCenter;