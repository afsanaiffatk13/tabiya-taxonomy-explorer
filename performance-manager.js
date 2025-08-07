// Performance Manager for handling data chunking and progressive loading
// Manages UI responsiveness during large data operations

class PerformanceManager {
    constructor(options = {}) {
        this.options = {
            chunkSize: options.chunkSize || 100,
            frameBudget: options.frameBudget || 16, // 16ms = ~60fps
            maxChunksPerFrame: options.maxChunksPerFrame || 3,
            yieldThreshold: options.yieldThreshold || 8, // Yield after 8ms
            progressCallback: options.progressCallback || null,
            ...options
        };
        
        this.isProcessing = false;
        this.cancelToken = null;
        this.performanceMetrics = {
            totalOperations: 0,
            averageChunkTime: 0,
            frameDrops: 0,
            memoryUsage: []
        };
    }
    
    // Process large arrays in chunks with frame budget management
    async processInChunks(items, processor, options = {}) {
        const startTime = performance.now();
        const chunkOptions = { ...this.options, ...options };
        
        this.isProcessing = true;
        this.cancelToken = { cancelled: false };
        
        const results = [];
        const totalItems = items.length;
        let processed = 0;
        
        try {
            for (let i = 0; i < totalItems; i += chunkOptions.chunkSize) {
                // Check for cancellation
                if (this.cancelToken.cancelled) {
                    break;
                }
                
                const frameStart = performance.now();
                const chunk = items.slice(i, i + chunkOptions.chunkSize);
                
                // Process chunk
                const chunkResults = await this.processChunk(chunk, processor, chunkOptions);
                results.push(...chunkResults);
                
                processed += chunk.length;
                
                // Update progress
                if (chunkOptions.progressCallback) {
                    chunkOptions.progressCallback({
                        processed,
                        total: totalItems,
                        percentage: Math.round((processed / totalItems) * 100),
                        phase: chunkOptions.phase || 'Processing'
                    });
                }
                
                // Check frame budget and yield if necessary
                const frameTime = performance.now() - frameStart;
                if (frameTime > this.options.yieldThreshold) {
                    await this.yieldToMain();
                }
                
                // Track performance
                this.updateMetrics(frameTime);
            }
            
            const totalTime = performance.now() - startTime;
            console.log(`Chunk processing complete: ${totalItems} items in ${totalTime.toFixed(2)}ms`);
            
            return results;
            
        } finally {
            this.isProcessing = false;
            this.cancelToken = null;
        }
    }
    
    // Process individual chunk with error handling
    async processChunk(chunk, processor, options) {
        const results = [];
        
        for (const item of chunk) {
            try {
                const result = await processor(item, options);
                if (result !== null && result !== undefined) {
                    results.push(result);
                }
            } catch (error) {
                console.warn('Error processing item:', error, item);
                // Continue processing other items
            }
        }
        
        return results;
    }
    
    // Yield control to the main thread
    async yieldToMain() {
        return new Promise(resolve => {
            if ('scheduler' in window && 'postTask' in window.scheduler) {
                // Use modern scheduler API if available
                window.scheduler.postTask(resolve, { priority: 'background' });
            } else {
                // Fallback to setTimeout
                setTimeout(resolve, 0);
            }
        });
    }
    
    // Progressive rendering for DOM updates
    async renderInChunks(container, items, renderer, options = {}) {
        const renderOptions = { ...this.options, ...options };
        const fragment = document.createDocumentFragment();
        let renderedCount = 0;
        
        this.isProcessing = true;
        this.cancelToken = { cancelled: false };
        
        try {
            for (let i = 0; i < items.length; i += renderOptions.chunkSize) {
                if (this.cancelToken.cancelled) break;
                
                const frameStart = performance.now();
                const chunk = items.slice(i, i + renderOptions.chunkSize);
                
                // Render chunk to fragment
                chunk.forEach((item, index) => {
                    const element = renderer(item, i + index);
                    if (element) {
                        if (typeof element === 'string') {
                            const div = document.createElement('div');
                            div.innerHTML = element;
                            fragment.appendChild(div.firstChild);
                        } else {
                            fragment.appendChild(element);
                        }
                    }
                });
                
                renderedCount += chunk.length;
                
                // Append fragment to container periodically
                if (fragment.children.length > 0) {
                    container.appendChild(fragment);
                }
                
                // Update progress
                if (renderOptions.progressCallback) {
                    renderOptions.progressCallback({
                        rendered: renderedCount,
                        total: items.length,
                        percentage: Math.round((renderedCount / items.length) * 100),
                        phase: 'Rendering'
                    });
                }
                
                // Check frame budget
                const frameTime = performance.now() - frameStart;
                if (frameTime > this.options.yieldThreshold) {
                    await this.yieldToMain();
                }
            }
            
        } finally {
            // Append any remaining elements
            if (fragment.children.length > 0) {
                container.appendChild(fragment);
            }
            
            this.isProcessing = false;
            this.cancelToken = null;
        }
    }
    
    // Smart data loading with prioritization
    async loadDataProgressively(dataSources, options = {}) {
        const loadOptions = { ...this.options, ...options };
        const results = {};
        
        // Sort data sources by priority
        const prioritizedSources = Object.entries(dataSources).sort((a, b) => {
            return (a[1].priority || 0) - (b[1].priority || 0);
        });
        
        for (const [key, source] of prioritizedSources) {
            try {
                if (loadOptions.progressCallback) {
                    loadOptions.progressCallback({
                        phase: `Loading ${key}`,
                        message: source.description || `Loading ${key} data...`
                    });
                }
                
                const data = await this.loadDataSource(source);
                results[key] = data;
                
                // Yield after each major data load
                await this.yieldToMain();
                
            } catch (error) {
                console.error(`Failed to load ${key}:`, error);
                results[key] = source.fallback || [];
            }
        }
        
        return results;
    }
    
    // Load individual data source
    async loadDataSource(source) {
        if (source.url) {
            const response = await fetch(source.url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return source.parser ? source.parser(await response.text()) : await response.json();
        } else if (source.data) {
            return source.data;
        } else if (source.loader) {
            return await source.loader();
        } else {
            throw new Error('Invalid data source configuration');
        }
    }
    
    // Cancel current operation
    cancel() {
        if (this.cancelToken) {
            this.cancelToken.cancelled = true;
        }
    }
    
    // Update performance metrics
    updateMetrics(frameTime) {
        this.performanceMetrics.totalOperations++;
        
        // Update average chunk time
        const currentAvg = this.performanceMetrics.averageChunkTime;
        const totalOps = this.performanceMetrics.totalOperations;
        this.performanceMetrics.averageChunkTime = 
            (currentAvg * (totalOps - 1) + frameTime) / totalOps;
        
        // Track frame drops (>16ms)
        if (frameTime > 16) {
            this.performanceMetrics.frameDrops++;
        }
        
        // Track memory usage periodically
        if (totalOps % 100 === 0 && 'memory' in performance) {
            this.performanceMetrics.memoryUsage.push({
                timestamp: Date.now(),
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize
            });
            
            // Keep only last 50 measurements
            if (this.performanceMetrics.memoryUsage.length > 50) {
                this.performanceMetrics.memoryUsage.shift();
            }
        }
    }
    
    // Get performance report
    getPerformanceReport() {
        const report = { ...this.performanceMetrics };
        
        // Calculate frame drop percentage
        report.frameDropPercentage = this.performanceMetrics.totalOperations > 0 ? 
            (this.performanceMetrics.frameDrops / this.performanceMetrics.totalOperations * 100).toFixed(2) : 0;
        
        // Memory trend
        if (report.memoryUsage.length > 1) {
            const first = report.memoryUsage[0];
            const last = report.memoryUsage[report.memoryUsage.length - 1];
            report.memoryTrend = {
                start: first.used,
                end: last.used,
                change: last.used - first.used,
                changePercent: ((last.used - first.used) / first.used * 100).toFixed(2)
            };
        }
        
        return report;
    }
    
    // Reset metrics
    resetMetrics() {
        this.performanceMetrics = {
            totalOperations: 0,
            averageChunkTime: 0,
            frameDrops: 0,
            memoryUsage: []
        };
    }
}

// Progress UI Component
class ProgressUI {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            showPercentage: true,
            showMessage: true,
            showPhase: true,
            animated: true,
            ...options
        };
        
        this.element = null;
        this.isVisible = false;
        this.currentProgress = 0;
    }
    
    show(initialPhase = 'Loading') {
        if (this.isVisible) return;
        
        this.element = document.createElement('div');
        this.element.className = 'performance-progress';
        this.element.innerHTML = `
            <div class="progress-container">
                <div class="progress-header">
                    <div class="progress-phase">${initialPhase}</div>
                    <div class="progress-percentage">0%</div>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
                <div class="progress-message">Initializing...</div>
            </div>
        `;
        
        // Add styles
        this.addStyles();
        
        this.container.appendChild(this.element);
        this.isVisible = true;
        
        // Animate in
        requestAnimationFrame(() => {
            this.element.style.opacity = '1';
        });
    }
    
    update(progress) {
        if (!this.isVisible || !this.element) return;
        
        const { phase, percentage, message, processed, total } = progress;
        
        // Update phase
        if (phase) {
            const phaseEl = this.element.querySelector('.progress-phase');
            if (phaseEl) phaseEl.textContent = phase;
        }
        
        // Update percentage
        const percent = percentage || (processed && total ? Math.round((processed / total) * 100) : 0);
        const percentEl = this.element.querySelector('.progress-percentage');
        const barEl = this.element.querySelector('.progress-bar');
        
        if (percentEl) percentEl.textContent = `${percent}%`;
        if (barEl) {
            barEl.style.width = `${percent}%`;
            this.currentProgress = percent;
        }
        
        // Update message
        if (message) {
            const messageEl = this.element.querySelector('.progress-message');
            if (messageEl) {
                messageEl.textContent = processed && total ? 
                    `${message} (${processed.toLocaleString()}/${total.toLocaleString()})` : 
                    message;
            }
        }
    }
    
    hide() {
        if (!this.isVisible || !this.element) return;
        
        this.element.style.opacity = '0';
        setTimeout(() => {
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            this.element = null;
            this.isVisible = false;
        }, 300);
    }
    
    addStyles() {
        if (document.getElementById('performance-progress-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'performance-progress-styles';
        styles.textContent = `
            .performance-progress {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--bg-white);
                border-radius: var(--radius-lg);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
                padding: 32px;
                min-width: 400px;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .progress-container {
                text-align: center;
            }
            
            .progress-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }
            
            .progress-phase {
                font-size: 18px;
                font-weight: var(--font-weight-bold);
                color: var(--oxford-blue);
            }
            
            .progress-percentage {
                font-size: 16px;
                font-weight: var(--font-weight-semibold);
                color: var(--tabiya-dark-green);
                font-family: var(--font-family-mono);
            }
            
            .progress-bar-container {
                width: 100%;
                height: 8px;
                background: var(--border-light);
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 16px;
            }
            
            .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, var(--tabiya-green), var(--tabiya-dark-green));
                border-radius: 4px;
                transition: width 0.3s ease;
                position: relative;
            }
            
            .progress-bar::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                bottom: 0;
                right: 0;
                background-image: linear-gradient(
                    -45deg,
                    rgba(255, 255, 255, 0.2) 25%,
                    transparent 25%,
                    transparent 50%,
                    rgba(255, 255, 255, 0.2) 50%,
                    rgba(255, 255, 255, 0.2) 75%,
                    transparent 75%,
                    transparent
                );
                background-size: 12px 12px;
                animation: progress-animation 1s linear infinite;
            }
            
            @keyframes progress-animation {
                0% { background-position: 0 0; }
                100% { background-position: 12px 0; }
            }
            
            .progress-message {
                font-size: 14px;
                color: var(--text-secondary);
                margin-top: 8px;
            }
        `;
        
        document.head.appendChild(styles);
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PerformanceManager, ProgressUI };
}