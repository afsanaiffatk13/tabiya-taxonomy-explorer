// Virtual Scroller for handling large lists efficiently
// Only renders visible items + buffer to maintain 60fps performance

class VirtualScroller {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            itemHeight: options.itemHeight || 44,
            buffer: options.buffer || 10,
            overscan: options.overscan || 5,
            threshold: options.threshold || 100, // Enable virtual scrolling for lists > 100 items
            ...options
        };
        
        // State
        this.items = [];
        this.visibleStart = 0;
        this.visibleEnd = 0;
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.totalHeight = 0;
        
        // DOM elements
        this.viewport = null;
        this.content = null;
        this.topSpacer = null;
        this.bottomSpacer = null;
        
        // Performance tracking
        this.renderCount = 0;
        this.lastRenderTime = 0;
        
        // Callbacks
        this.renderItem = options.renderItem || this.defaultRenderItem;
        this.onScroll = options.onScroll || null;
        
        this.init();
    }
    
    init() {
        // Create virtual scrolling structure
        this.container.innerHTML = '';
        this.container.style.position = 'relative';
        this.container.style.overflow = 'auto';
        
        // Create viewport
        this.viewport = document.createElement('div');
        this.viewport.style.position = 'relative';
        this.viewport.style.width = '100%';
        
        // Create content container
        this.content = document.createElement('div');
        this.content.style.position = 'relative';
        
        // Create spacers
        this.topSpacer = document.createElement('div');
        this.bottomSpacer = document.createElement('div');
        
        // Assemble structure
        this.viewport.appendChild(this.topSpacer);
        this.viewport.appendChild(this.content);
        this.viewport.appendChild(this.bottomSpacer);
        this.container.appendChild(this.viewport);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initial measurements
        this.updateMeasurements();
    }
    
    setupEventListeners() {
        // Throttled scroll handler for performance
        let scrollTimeout = null;
        this.container.addEventListener('scroll', () => {
            this.scrollTop = this.container.scrollTop;
            
            if (scrollTimeout) return;
            scrollTimeout = setTimeout(() => {
                this.handleScroll();
                scrollTimeout = null;
            }, 16); // ~60fps
        });
        
        // Handle resize
        const resizeObserver = new ResizeObserver(entries => {
            this.updateMeasurements();
            this.render();
        });
        resizeObserver.observe(this.container);
        
        // Handle visibility changes for performance
        const intersectionObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.render();
                }
            });
        });
        intersectionObserver.observe(this.container);
    }
    
    setItems(items) {
        this.items = items || [];
        this.updateMeasurements();
        
        // Decide whether to use virtual scrolling
        if (this.items.length > this.options.threshold) {
            this.render();
        } else {
            this.renderAll();
        }
    }
    
    updateMeasurements() {
        this.containerHeight = this.container.clientHeight;
        this.totalHeight = this.items.length * this.options.itemHeight;
        this.viewport.style.height = `${this.totalHeight}px`;
    }
    
    handleScroll() {
        const newVisibleStart = Math.floor(this.scrollTop / this.options.itemHeight);
        const visibleCount = Math.ceil(this.containerHeight / this.options.itemHeight);
        const newVisibleEnd = newVisibleStart + visibleCount;
        
        // Only re-render if visible range changed significantly
        if (Math.abs(newVisibleStart - this.visibleStart) > this.options.overscan ||
            Math.abs(newVisibleEnd - this.visibleEnd) > this.options.overscan) {
            
            this.visibleStart = newVisibleStart;
            this.visibleEnd = newVisibleEnd;
            this.render();
        }
        
        // Call scroll callback if provided
        if (this.onScroll) {
            this.onScroll({
                scrollTop: this.scrollTop,
                visibleStart: this.visibleStart,
                visibleEnd: this.visibleEnd
            });
        }
    }
    
    render() {
        if (this.items.length === 0) {
            this.content.innerHTML = '';
            return;
        }
        
        const startTime = performance.now();
        
        // Skip virtual scrolling for small lists
        if (this.items.length <= this.options.threshold) {
            this.renderAll();
            return;
        }
        
        // Calculate visible range with buffer
        const bufferStart = Math.max(0, this.visibleStart - this.options.buffer);
        const bufferEnd = Math.min(this.items.length, this.visibleEnd + this.options.buffer);
        
        // Calculate spacer sizes
        const topSpacerHeight = bufferStart * this.options.itemHeight;
        const bottomSpacerHeight = (this.items.length - bufferEnd) * this.options.itemHeight;
        
        // Update spacers
        this.topSpacer.style.height = `${topSpacerHeight}px`;
        this.bottomSpacer.style.height = `${bottomSpacerHeight}px`;
        
        // Render only visible items
        const visibleItems = this.items.slice(bufferStart, bufferEnd);
        const renderedHtml = visibleItems.map((item, index) => {
            const actualIndex = bufferStart + index;
            return this.renderItem(item, actualIndex, this.isItemSelected(item));
        }).join('');
        
        this.content.innerHTML = renderedHtml;
        
        // Performance tracking
        this.renderCount++;
        this.lastRenderTime = performance.now() - startTime;
        
        // Debug info
        if (this.options.debug) {
            console.log(`Virtual render #${this.renderCount}: ${visibleItems.length} items in ${this.lastRenderTime.toFixed(2)}ms`);
        }
    }
    
    renderAll() {
        // Fallback for small lists - render everything normally
        const renderedHtml = this.items.map((item, index) => {
            return this.renderItem(item, index, this.isItemSelected(item));
        }).join('');
        
        this.content.innerHTML = renderedHtml;
        this.topSpacer.style.height = '0px';
        this.bottomSpacer.style.height = '0px';
    }
    
    defaultRenderItem(item, index, isSelected) {
        const selectedClass = isSelected ? 'selected' : '';
        return `
            <div class="virtual-item ${selectedClass}" 
                 data-index="${index}" 
                 style="height: ${this.options.itemHeight}px; display: flex; align-items: center; padding: 0 16px;">
                <span>${item.label || item.toString()}</span>
            </div>
        `;
    }
    
    isItemSelected(item) {
        // Override this method to implement selection logic
        return false;
    }
    
    scrollToItem(index) {
        const targetScrollTop = index * this.options.itemHeight;
        this.container.scrollTop = targetScrollTop;
        this.scrollTop = targetScrollTop;
        this.handleScroll();
    }
    
    scrollToTop() {
        this.scrollToItem(0);
    }
    
    getVisibleRange() {
        return {
            start: this.visibleStart,
            end: this.visibleEnd,
            buffer: this.options.buffer
        };
    }
    
    updateItem(index, newItem) {
        if (index >= 0 && index < this.items.length) {
            this.items[index] = newItem;
            
            // Re-render if item is currently visible
            if (index >= this.visibleStart - this.options.buffer && 
                index <= this.visibleEnd + this.options.buffer) {
                this.render();
            }
        }
    }
    
    destroy() {
        // Clean up event listeners and observers
        this.container.innerHTML = '';
    }
}

// Specialized Tree Virtual Scroller for taxonomy trees
class TreeVirtualScroller extends VirtualScroller {
    constructor(container, options = {}) {
        super(container, {
            itemHeight: 48, // Tree nodes are typically taller
            threshold: 200, // Enable for trees with > 200 items
            ...options
        });
        
        this.expandedNodes = new Set();
        this.selectedNode = null;
        this.flattenedItems = [];
    }
    
    setTreeData(treeData, expanded = new Set()) {
        this.expandedNodes = new Set(expanded);
        this.flattenedItems = this.flattenTree(treeData);
        this.setItems(this.flattenedItems);
    }
    
    flattenTree(nodes, level = 0) {
        const flattened = [];
        
        if (!Array.isArray(nodes)) return flattened;
        
        nodes.forEach(node => {
            // Add the node itself
            flattened.push({
                ...node,
                level: level,
                hasChildren: node.children && node.children.length > 0,
                isExpanded: this.expandedNodes.has(node.id || node.code)
            });
            
            // Add children if expanded
            if (node.children && 
                node.children.length > 0 && 
                this.expandedNodes.has(node.id || node.code)) {
                
                const childItems = this.flattenTree(node.children, level + 1);
                flattened.push(...childItems);
            }
        });
        
        return flattened;
    }
    
    toggleNode(nodeId) {
        if (this.expandedNodes.has(nodeId)) {
            this.expandedNodes.delete(nodeId);
        } else {
            this.expandedNodes.add(nodeId);
        }
        
        // Rebuild flattened tree
        this.setTreeData(this.originalTreeData, this.expandedNodes);
    }
    
    selectNode(nodeId) {
        this.selectedNode = nodeId;
        this.render();
    }
    
    isItemSelected(item) {
        return this.selectedNode === (item.id || item.code);
    }
    
    renderTreeItem(item, index, isSelected) {
        const selectedClass = isSelected ? 'selected' : '';
        const indent = item.level * 24;
        const hasChildren = item.hasChildren;
        const isExpanded = item.isExpanded;
        
        const toggleIcon = hasChildren ? 
            (isExpanded ? 'fa-chevron-down' : 'fa-chevron-right') : '';
        
        const code = item.code ? `<span class="tree-code">${item.code}</span>` : '';
        
        return `
            <div class="tree-node virtual-tree-item ${selectedClass} ${item.type || ''}" 
                 data-index="${index}" 
                 data-id="${item.id || item.code}"
                 style="height: ${this.options.itemHeight}px; padding-left: ${indent + 16}px;">
                
                <div class="tree-toggle" style="width: 24px;">
                    ${toggleIcon ? `<i class="fas ${toggleIcon}"></i>` : ''}
                </div>
                
                ${code}
                
                <span class="tree-label">${item.label}</span>
                
                ${item.isLocalized ? '<span class="localized-badge">ZA</span>' : ''}
            </div>
        `;
    }
}

// Performance-optimized Search Results Scroller
class SearchVirtualScroller extends VirtualScroller {
    constructor(container, options = {}) {
        super(container, {
            itemHeight: 52, // Search results need more height
            threshold: 50, // Enable for > 50 search results
            ...options
        });
        
        this.query = '';
        this.highlightedTerms = [];
    }
    
    setSearchResults(results, query = '') {
        this.query = query.toLowerCase();
        this.highlightedTerms = this.query.split(' ').filter(term => term.length > 0);
        this.setItems(results);
    }
    
    renderSearchItem(item, index, isSelected) {
        const selectedClass = isSelected ? 'selected' : '';
        const code = item.code ? `<span class="tree-code">${item.code}</span>` : '';
        const highlightedLabel = this.highlightText(item.label, this.highlightedTerms);
        
        return `
            <div class="tree-node virtual-search-item ${selectedClass}" 
                 data-index="${index}" 
                 data-code="${item.code || item.id}"
                 style="height: ${this.options.itemHeight}px;">
                
                <div class="tree-toggle"></div>
                ${code}
                <span class="tree-label">${highlightedLabel}</span>
                
                ${item.isLocalized ? '<span class="localized-badge">ZA</span>' : ''}
            </div>
        `;
    }
    
    highlightText(text, terms) {
        if (!terms.length) return text;
        
        let highlighted = text;
        terms.forEach(term => {
            const regex = new RegExp(`(${this.escapeRegExp(term)})`, 'gi');
            highlighted = highlighted.replace(regex, '<mark>$1</mark>');
        });
        
        return highlighted;
    }
    
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// Export classes for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VirtualScroller, TreeVirtualScroller, SearchVirtualScroller };
}