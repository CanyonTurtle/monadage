/**
 * Result Viewer Web Component
 * Displays processed image results with download options
 */

import { appState, stateManager } from '../utils/state-manager.js';

export class ResultViewer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        this.render();
        this.setupEventListeners();
        this.setupStateSubscription();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    margin-top: 2rem;
                }
                
                .results-container {
                    background: white;
                    border-radius: 0.5rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e5e7eb;
                    padding: 1.5rem;
                    display: none;
                }
                
                .results-container.visible {
                    display: block;
                }
                
                .results-header {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #111827;
                    margin-bottom: 1.5rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                
                .header-content {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .header-icon {
                    width: 1.25rem;
                    height: 1.25rem;
                    color: #6b7280;
                }
                
                .results-actions {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .btn-action {
                    background: #f3f4f6;
                    color: #374151;
                    border: 1px solid #d1d5db;
                    border-radius: 0.375rem;
                    padding: 0.5rem 1rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.875rem;
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }
                
                .btn-action:hover {
                    background: #e5e7eb;
                }
                
                .btn-action.primary {
                    background: #3b82f6;
                    color: white;
                    border-color: #3b82f6;
                }
                
                .btn-action.primary:hover {
                    background: #2563eb;
                }
                
                .results-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1.5rem;
                }
                
                .result-item {
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    overflow: hidden;
                    transition: all 0.2s ease;
                    background: white;
                }
                
                .result-item:hover {
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
                    transform: translateY(-2px);
                }
                
                .result-preview {
                    position: relative;
                    aspect-ratio: 1;
                    overflow: hidden;
                    background: #f9fafb;
                }
                
                .result-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.2s;
                }
                
                .result-item:hover .result-image {
                    transform: scale(1.05);
                }
                
                .result-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.8));
                    opacity: 0;
                    transition: opacity 0.2s;
                    display: flex;
                    align-items: flex-end;
                    padding: 1rem;
                }
                
                .result-item:hover .result-overlay {
                    opacity: 1;
                }
                
                .overlay-content {
                    color: white;
                    width: 100%;
                }
                
                .pipeline-info {
                    font-size: 0.875rem;
                    opacity: 0.9;
                    margin-bottom: 0.5rem;
                }
                
                .overlay-actions {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .btn-overlay {
                    background: rgba(255, 255, 255, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    border-radius: 0.25rem;
                    padding: 0.25rem 0.75rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }
                
                .btn-overlay:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
                
                .result-info {
                    padding: 1rem;
                }
                
                .result-name {
                    font-weight: 600;
                    color: #111827;
                    margin-bottom: 0.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                
                .result-details {
                    font-size: 0.875rem;
                    color: #6b7280;
                    margin-bottom: 1rem;
                }
                
                .result-pipeline {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.25rem;
                    margin-bottom: 1rem;
                }
                
                .pipeline-tag {
                    background: #f3f4f6;
                    color: #374151;
                    padding: 0.125rem 0.5rem;
                    border-radius: 0.25rem;
                    font-size: 0.75rem;
                    border: 1px solid #e5e7eb;
                }
                
                .result-actions {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .btn-download {
                    flex: 1;
                    background: #10b981;
                    color: white;
                    border: none;
                    border-radius: 0.375rem;
                    padding: 0.75rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }
                
                .btn-download:hover {
                    background: #059669;
                }
                
                .btn-compare {
                    background: #f3f4f6;
                    color: #374151;
                    border: 1px solid #d1d5db;
                    border-radius: 0.375rem;
                    padding: 0.75rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .btn-compare:hover {
                    background: #e5e7eb;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 3rem 1rem;
                    color: #6b7280;
                }
                
                .empty-icon {
                    width: 4rem;
                    height: 4rem;
                    margin: 0 auto 1rem;
                    color: #d1d5db;
                }
                
                .comparison-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    padding: 2rem;
                }
                
                .comparison-content {
                    background: white;
                    border-radius: 0.5rem;
                    padding: 1.5rem;
                    max-width: 90vw;
                    max-height: 90vh;
                    overflow: auto;
                }
                
                .comparison-images {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                
                .comparison-image {
                    text-align: center;
                }
                
                .comparison-image img {
                    max-width: 100%;
                    max-height: 60vh;
                    object-fit: contain;
                    border-radius: 0.25rem;
                    border: 1px solid #e5e7eb;
                }
                
                .comparison-label {
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    color: #111827;
                }
                
                @media (max-width: 768px) {
                    .results-grid {
                        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                        gap: 1rem;
                    }
                    
                    .results-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                    }
                    
                    .results-actions {
                        width: 100%;
                        justify-content: flex-end;
                    }
                    
                    .comparison-images {
                        grid-template-columns: 1fr;
                    }
                }
                
                @media (max-width: 640px) {
                    .results-grid {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
            
            <div class="results-container" id="results-container">
                <div class="results-header">
                    <div class="header-content">
                        <svg class="header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                        </svg>
                        Your Transformed Photos (<span id="result-count">0</span>)
                    </div>
                    <div class="results-actions">
                        <button class="btn-action" onclick="this.getRootNode().host.downloadAll()">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            Download All
                        </button>
                        <button class="btn-action" onclick="this.getRootNode().host.clearResults()">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                            Clear
                        </button>
                    </div>
                </div>
                
                <div class="results-grid" id="results-grid"></div>
            </div>
            
            <div class="comparison-modal" id="comparison-modal" style="display: none;">
                <div class="comparison-content">
                    <div class="comparison-images">
                        <div class="comparison-image">
                            <div class="comparison-label">Original</div>
                            <img id="comparison-original" alt="Original image">
                        </div>
                        <div class="comparison-image">
                            <div class="comparison-label">Transformed</div>
                            <img id="comparison-result" alt="Transformed image">
                        </div>
                    </div>
                    <button class="btn-action primary" onclick="this.getRootNode().host.hideComparison()">Close</button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Close comparison modal when clicking outside
        this.shadowRoot.getElementById('comparison-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('comparison-modal')) {
                this.hideComparison();
            }
        });
    }

    setupStateSubscription() {
        appState.subscribe((state, changes) => {
            if (changes === 'results' || Array.isArray(changes)) {
                this.updateResults();
            }
        });
    }

    updateResults() {
        const container = this.shadowRoot.getElementById('results-container');
        const grid = this.shadowRoot.getElementById('results-grid');
        const countElement = this.shadowRoot.getElementById('result-count');
        
        countElement.textContent = appState.results.length;
        
        if (appState.results.length === 0) {
            container.classList.remove('visible');
            return;
        }
        
        container.classList.add('visible');
        
        grid.innerHTML = appState.results.map(result => this.renderResult(result)).join('');
    }

    renderResult(result) {
        const pipelineNames = result.pipeline || [];
        
        return `
            <div class="result-item">
                <div class="result-preview">
                    <img src="${result.dataUrl}" alt="${result.originalName}" class="result-image">
                    <div class="result-overlay">
                        <div class="overlay-content">
                            <div class="pipeline-info">Pipeline: ${pipelineNames.join(' → ')}</div>
                            <div class="overlay-actions">
                                <button class="btn-overlay" onclick="this.getRootNode().host.downloadResult('${result.id}')">
                                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3"/>
                                    </svg>
                                    Download
                                </button>
                                <button class="btn-overlay" onclick="this.getRootNode().host.showComparison('${result.id}')">
                                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                    </svg>
                                    Compare
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="result-info">
                    <div class="result-name">
                        ${result.originalName}
                        <span style="font-size: 0.875rem; font-weight: normal; color: #6b7280;">
                            ${this.formatTimestamp(result.timestamp)}
                        </span>
                    </div>
                    <div class="result-details">
                        ${result.width}×${result.height} • ${this.formatFileSize(result.size)}
                    </div>
                    <div class="result-pipeline">
                        ${pipelineNames.map(name => `<span class="pipeline-tag">${this.formatEffectName(name)}</span>`).join('')}
                    </div>
                    <div class="result-actions">
                        <button class="btn-download" onclick="this.getRootNode().host.downloadResult('${result.id}')">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            Download
                        </button>
                        <button class="btn-compare" onclick="this.getRootNode().host.showComparison('${result.id}')" title="Compare with original">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    downloadResult(resultId) {
        const result = appState.results.find(r => r.id === resultId);
        if (!result) return;
        
        const link = document.createElement('a');
        link.href = result.dataUrl;
        link.download = this.generateFileName(result);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async downloadAll() {
        if (appState.results.length === 0) return;
        
        // Create a zip file with all results
        // For now, download individually
        for (const result of appState.results) {
            await new Promise(resolve => {
                setTimeout(() => {
                    this.downloadResult(result.id);
                    resolve();
                }, 100);
            });
        }
    }

    showComparison(resultId) {
        const result = appState.results.find(r => r.id === resultId);
        if (!result) return;
        
        const modal = this.shadowRoot.getElementById('comparison-modal');
        const originalImg = this.shadowRoot.getElementById('comparison-original');
        const resultImg = this.shadowRoot.getElementById('comparison-result');
        
        // Find the original image
        const originalImage = appState.images.find(img => img.name === result.originalName);
        if (originalImage) {
            originalImg.src = originalImage.preview;
        }
        
        resultImg.src = result.dataUrl;
        modal.style.display = 'flex';
    }

    hideComparison() {
        this.shadowRoot.getElementById('comparison-modal').style.display = 'none';
    }

    clearResults() {
        if (confirm('Are you sure you want to clear all results?')) {
            stateManager.clearResults();
        }
    }

    generateFileName(result) {
        const baseName = result.originalName.replace(/\.[^/.]+$/, '');
        const pipelineString = result.pipeline.join('_');
        const timestamp = new Date(result.timestamp).toISOString().slice(0, 19).replace(/[:.]/g, '-');
        return `${baseName}_${pipelineString}_${timestamp}.png`;
    }

    formatEffectName(name) {
        return name.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    formatTimestamp(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        
        return new Date(timestamp).toLocaleDateString();
    }
}

customElements.define('result-viewer', ResultViewer);