/**
 * Pipeline Builder Web Component
 * Handles effect pipeline creation and management
 */

import { appState, stateManager } from '../utils/state-manager.js';
import { effectRegistry } from '../effects/effect-registry.js';

export class PipelineBuilder extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.draggedEffect = null;
        
        this.render();
        this.setupEventListeners();
        this.setupStateSubscription();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                
                .pipeline-container {
                    background: white;
                    border-radius: 0.5rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e5e7eb;
                    padding: 1.5rem;
                }
                
                .pipeline-header {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #111827;
                    margin-bottom: 1.5rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .header-icon {
                    width: 1.25rem;
                    height: 1.25rem;
                    color: #6b7280;
                }
                
                .pipeline-builder {
                    min-height: 200px;
                    margin-bottom: 1.5rem;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 3rem 1rem;
                    color: #6b7280;
                }
                
                .empty-icon {
                    width: 3rem;
                    height: 3rem;
                    margin: 0 auto 1rem;
                    color: #d1d5db;
                }
                
                .effect-chain {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .effect-card {
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    overflow: hidden;
                    transition: all 0.2s ease;
                    cursor: move;
                }
                
                .effect-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                }
                
                .effect-card.dragging {
                    opacity: 0.7;
                    transform: rotate(2deg);
                }
                
                .effect-card.drag-over {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
                }
                
                .effect-content {
                    display: flex;
                    height: 6rem;
                }
                
                .effect-preview {
                    width: 6rem;
                    height: 6rem;
                    background: linear-gradient(45deg, #f3f4f6 25%, transparent 25%), 
                                linear-gradient(-45deg, #f3f4f6 25%, transparent 25%), 
                                linear-gradient(45deg, transparent 75%, #f3f4f6 75%), 
                                linear-gradient(-45deg, transparent 75%, #f3f4f6 75%);
                    background-size: 10px 10px;
                    background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    color: #6b7280;
                    border-right: 1px solid #e5e7eb;
                }
                
                .effect-info {
                    flex: 1;
                    padding: 1rem;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                
                .effect-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 0.5rem;
                }
                
                .effect-name {
                    font-weight: 600;
                    color: #111827;
                }
                
                .effect-actions {
                    display: flex;
                    gap: 0.25rem;
                }
                
                .btn-icon {
                    background: none;
                    border: none;
                    padding: 0.25rem;
                    border-radius: 0.25rem;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .btn-icon:hover {
                    background: #f3f4f6;
                }
                
                .btn-icon.remove:hover {
                    background: #fef2f2;
                    color: #ef4444;
                }
                
                .btn-icon.edit:hover {
                    background: #f0f9ff;
                    color: #3b82f6;
                }
                
                .effect-description {
                    font-size: 0.875rem;
                    color: #6b7280;
                    line-height: 1.4;
                }
                
                .effect-params {
                    margin-top: 0.5rem;
                    padding-top: 0.5rem;
                    border-top: 1px solid #f3f4f6;
                }
                
                .param-control {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.5rem;
                }
                
                .param-label {
                    font-size: 0.75rem;
                    color: #6b7280;
                    min-width: 4rem;
                }
                
                .param-input {
                    flex: 1;
                    height: 0.25rem;
                    background: #e5e7eb;
                    border-radius: 0.125rem;
                    appearance: none;
                    cursor: pointer;
                }
                
                .param-input::-webkit-slider-thumb {
                    appearance: none;
                    width: 1rem;
                    height: 1rem;
                    background: #3b82f6;
                    border-radius: 50%;
                    cursor: pointer;
                }
                
                .param-value {
                    font-size: 0.75rem;
                    color: #374151;
                    min-width: 2rem;
                    text-align: right;
                }
                
                .add-effect-btn {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    width: 100%;
                    margin-bottom: 1.5rem;
                }
                
                .add-effect-btn:hover {
                    background: #2563eb;
                }
                
                .add-effect-btn.secondary {
                    background: #f3f4f6;
                    color: #374151;
                    border: 1px solid #d1d5db;
                }
                
                .add-effect-btn.secondary:hover {
                    background: #e5e7eb;
                }
                
                .process-btn {
                    background: #10b981;
                    color: white;
                    border: none;
                    border-radius: 0.5rem;
                    padding: 1rem 1.5rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-weight: 500;
                    font-size: 1.1rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    width: 100%;
                }
                
                .process-btn:hover {
                    background: #059669;
                }
                
                .process-btn:disabled {
                    background: #d1d5db;
                    cursor: not-allowed;
                }
                
                .process-btn.processing {
                    background: #f59e0b;
                }
                
                .spinner {
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                .effect-selector {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                
                .effect-selector-content {
                    background: white;
                    border-radius: 0.5rem;
                    padding: 1.5rem;
                    max-width: 90vw;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
                }
                
                .effect-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 1rem;
                    margin-top: 1rem;
                }
                
                .effect-option {
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: center;
                }
                
                .effect-option:hover {
                    border-color: #3b82f6;
                    background: #f8fafc;
                }
                
                .drop-indicator {
                    height: 2px;
                    background: #3b82f6;
                    margin: 0.25rem 0;
                    border-radius: 1px;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                
                .drop-indicator.active {
                    opacity: 1;
                }
                
                @media (max-width: 640px) {
                    .pipeline-container {
                        padding: 1rem;
                    }
                    
                    .effect-content {
                        flex-direction: column;
                        height: auto;
                    }
                    
                    .effect-preview {
                        width: 100%;
                        height: 3rem;
                        border-right: none;
                        border-bottom: 1px solid #e5e7eb;
                    }
                    
                    .effect-grid {
                        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                    }
                }
            </style>
            
            <div class="pipeline-container">
                <h2 class="pipeline-header">
                    <svg class="header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/>
                    </svg>
                    Choose Your Effects
                </h2>
                
                <div class="pipeline-builder" id="pipeline-builder"></div>
                
                <button class="add-effect-btn" id="add-effect-btn">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    Add an Effect
                </button>
                
                <button class="process-btn" id="process-btn" disabled>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    Transform My Photos
                </button>
            </div>
            
            <div class="effect-selector" id="effect-selector" style="display: none;">
                <div class="effect-selector-content">
                    <h3 style="margin: 0 0 1rem 0; font-size: 1.25rem; font-weight: 600;">Choose an Effect</h3>
                    <div class="effect-grid" id="effect-grid"></div>
                    <button style="margin-top: 1rem; padding: 0.5rem 1rem; background: #6b7280; color: white; border: none; border-radius: 0.25rem; cursor: pointer;" 
                            onclick="this.getRootNode().host.hideEffectSelector()">Cancel</button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const addEffectBtn = this.shadowRoot.getElementById('add-effect-btn');
        const processBtn = this.shadowRoot.getElementById('process-btn');

        addEffectBtn.addEventListener('click', () => {
            this.showEffectSelector();
        });

        processBtn.addEventListener('click', () => {
            this.processImages();
        });

        // Close effect selector when clicking outside
        this.shadowRoot.getElementById('effect-selector').addEventListener('click', (e) => {
            if (e.target.classList.contains('effect-selector')) {
                this.hideEffectSelector();
            }
        });
    }

    setupStateSubscription() {
        appState.subscribe((state, changes) => {
            if (changes === 'pipeline' || changes === 'images' || changes === 'processing' || Array.isArray(changes)) {
                this.updatePipeline();
                this.updateButtons();
            }
        });
    }

    updatePipeline() {
        const pipelineBuilder = this.shadowRoot.getElementById('pipeline-builder');
        
        if (appState.pipeline.length === 0) {
            pipelineBuilder.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    <p>No effects added yet.</p>
                    <p style="font-size: 0.875rem; margin-top: 0.5rem;">Click "Add an Effect" to start transforming your photos.</p>
                </div>
            `;
        } else {
            pipelineBuilder.innerHTML = `
                <div class="effect-chain" id="effect-chain">
                    ${appState.pipeline.map((effect, index) => this.renderEffect(effect, index)).join('')}
                </div>
            `;
            
            this.setupDragAndDrop();
        }
    }

    renderEffect(effect, index) {
        const hasParams = Object.keys(effect.params || {}).length > 0;
        
        return `
            <div class="drop-indicator" data-index="${index}"></div>
            <div class="effect-card" draggable="true" data-effect-id="${effect.id}" data-index="${index}">
                <div class="effect-content">
                    <div class="effect-preview">
                        Preview
                    </div>
                    <div class="effect-info">
                        <div class="effect-header">
                            <div class="effect-name">${effect.displayName}</div>
                            <div class="effect-actions">
                                ${this.hasParameters(effect.name) ? `
                                    <button class="btn-icon edit" onclick="this.getRootNode().host.editEffect('${effect.name}')" title="Edit Parameters">
                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        </svg>
                                    </button>
                                ` : ''}
                                <button class="btn-icon" onclick="this.getRootNode().host.moveEffectUp(${index})" 
                                        ${index === 0 ? 'disabled' : ''} title="Move Up">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
                                    </svg>
                                </button>
                                <button class="btn-icon" onclick="this.getRootNode().host.moveEffectDown(${index})" 
                                        ${index === appState.pipeline.length - 1 ? 'disabled' : ''} title="Move Down">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V4"/>
                                    </svg>
                                </button>
                                <button class="btn-icon remove" onclick="this.getRootNode().host.removeEffect('${effect.id}')" title="Remove">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="effect-description">${effect.description}</div>
                        ${hasParams ? this.renderEffectParams(effect) : ''}
                    </div>
                </div>
            </div>
            ${index === appState.pipeline.length - 1 ? '<div class="drop-indicator" data-index="' + (index + 1) + '"></div>' : ''}
        `;
    }

    renderEffectParams(effect) {
        const paramEntries = Object.entries(effect.params || {});
        if (paramEntries.length === 0) return '';
        
        return `
            <div class="effect-params">
                ${paramEntries.map(([paramName, paramValue]) => {
                    const paramConfig = appState.availableEffects
                        .find(e => e.name === effect.name)?.params?.[paramName];
                    
                    if (!paramConfig) return '';
                    
                    return `
                        <div class="param-control">
                            <label class="param-label">${paramConfig.label || paramName}</label>
                            <input type="range" 
                                   class="param-input"
                                   min="${paramConfig.min || 0}"
                                   max="${paramConfig.max || 1}"
                                   step="0.01"
                                   value="${paramValue}"
                                   oninput="this.getRootNode().host.updateParam('${effect.id}', '${paramName}', parseFloat(this.value))">
                            <span class="param-value">${Number(paramValue).toFixed(2)}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    setupDragAndDrop() {
        const effectCards = this.shadowRoot.querySelectorAll('.effect-card[draggable="true"]');
        
        effectCards.forEach(card => {
            card.addEventListener('dragstart', this.handleDragStart.bind(this));
            card.addEventListener('dragend', this.handleDragEnd.bind(this));
            card.addEventListener('dragover', this.handleDragOver.bind(this));
            card.addEventListener('drop', this.handleDrop.bind(this));
        });
    }

    handleDragStart(e) {
        this.draggedEffect = {
            id: e.target.dataset.effectId,
            index: parseInt(e.target.dataset.index)
        };
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.clearDropIndicators();
        this.draggedEffect = null;
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const targetCard = e.target.closest('.effect-card');
        if (targetCard && this.draggedEffect) {
            const targetIndex = parseInt(targetCard.dataset.index);
            this.showDropIndicator(targetIndex);
        }
    }

    handleDrop(e) {
        e.preventDefault();
        
        const targetCard = e.target.closest('.effect-card');
        if (targetCard && this.draggedEffect) {
            const targetIndex = parseInt(targetCard.dataset.index);
            const sourceIndex = this.draggedEffect.index;
            
            if (sourceIndex !== targetIndex) {
                stateManager.reorderPipeline(sourceIndex, targetIndex);
            }
        }
        
        this.clearDropIndicators();
    }

    showDropIndicator(index) {
        this.clearDropIndicators();
        const indicator = this.shadowRoot.querySelector(`[data-index="${index}"]`);
        if (indicator) {
            indicator.classList.add('active');
        }
    }

    clearDropIndicators() {
        this.shadowRoot.querySelectorAll('.drop-indicator').forEach(indicator => {
            indicator.classList.remove('active');
        });
    }

    updateButtons() {
        const addBtn = this.shadowRoot.getElementById('add-effect-btn');
        const processBtn = this.shadowRoot.getElementById('process-btn');
        
        // Update add button style
        if (appState.pipeline.length > 0) {
            addBtn.className = 'add-effect-btn secondary';
            addBtn.innerHTML = `
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                Add Another Effect
            `;
        } else {
            addBtn.className = 'add-effect-btn';
            addBtn.innerHTML = `
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                Add an Effect
            `;
        }
        
        // Update process button
        const canProcess = stateManager.canProcess();
        processBtn.disabled = !canProcess;
        
        if (appState.processing) {
            processBtn.className = 'process-btn processing';
            processBtn.innerHTML = `
                <svg class="spinner" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Processing... ${Math.round(appState.processingProgress)}%
            `;
        } else if (!appState.images.length && !appState.pipeline.length) {
            processBtn.innerHTML = 'Add photos and effects to transform';
        } else if (!appState.images.length) {
            processBtn.innerHTML = 'Add photos to transform';
        } else if (!appState.pipeline.length) {
            processBtn.innerHTML = 'Add effects to transform';
        } else {
            processBtn.className = 'process-btn';
            processBtn.innerHTML = `
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                Transform My Photos
            `;
        }
    }

    showEffectSelector() {
        const selector = this.shadowRoot.getElementById('effect-selector');
        const grid = this.shadowRoot.getElementById('effect-grid');
        
        grid.innerHTML = appState.availableEffects.map(effect => `
            <div class="effect-option" onclick="this.getRootNode().host.selectEffect('${effect.name}')">
                <h4 style="margin: 0 0 0.5rem 0; font-weight: 600;">${effect.displayName}</h4>
                <p style="margin: 0; font-size: 0.875rem; color: #6b7280; line-height: 1.4;">${effect.description}</p>
            </div>
        `).join('');
        
        selector.style.display = 'flex';
    }

    hideEffectSelector() {
        this.shadowRoot.getElementById('effect-selector').style.display = 'none';
    }

    selectEffect(effectName) {
        stateManager.addEffectToPipeline(effectName);
        this.hideEffectSelector();
    }

    removeEffect(effectId) {
        stateManager.removeEffectFromPipeline(effectId);
    }

    moveEffectUp(index) {
        if (index > 0) {
            stateManager.reorderPipeline(index, index - 1);
        }
    }

    moveEffectDown(index) {
        if (index < appState.pipeline.length - 1) {
            stateManager.reorderPipeline(index, index + 1);
        }
    }

    updateParam(effectId, paramName, value) {
        stateManager.updateEffectParams(effectId, paramName, value);
    }

    hasParameters(effectName) {
        const effect = effectRegistry.getEffect(effectName);
        return effect && Object.keys(effect.parameters || {}).length > 0;
    }

    editEffect(effectName) {
        // Signal the effect controls component to show controls for this effect
        const effectControls = document.getElementById('effect-controls');
        if (effectControls) {
            effectControls.selectEffect(effectName);
            
            // Scroll the controls into view
            effectControls.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }

    async processImages() {
        if (!stateManager.canProcess()) return;
        
        try {
            stateManager.setProcessing(true, 0);
            
            // Import the processor
            const { ImageProcessor } = await import('../processors/image-processor.js');
            const processor = new ImageProcessor();
            
            // Clear previous results
            stateManager.clearResults();
            
            const totalImages = appState.images.length;
            
            for (let i = 0; i < totalImages; i++) {
                const image = appState.images[i];
                const progress = (i / totalImages) * 100;
                stateManager.setProcessing(true, progress);
                
                try {
                    const result = await processor.processImage(image, appState.pipeline);
                    stateManager.addResult(result);
                } catch (error) {
                    console.error('Error processing image:', image.name, error);
                    stateManager.setError(`Failed to process ${image.name}: ${error.message}`);
                }
            }
            
            stateManager.setProcessing(false, 100);
            
        } catch (error) {
            console.error('Processing error:', error);
            stateManager.setError(`Processing failed: ${error.message}`);
            stateManager.setProcessing(false, 0);
        }
    }
}

customElements.define('pipeline-builder', PipelineBuilder);