/**
 * Image Uploader Web Component
 * Handles file uploads with drag & drop support
 */

import { appState, stateManager } from '../utils/state-manager.js';

export class ImageUploader extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isDragging = false;
        
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
                
                .upload-container {
                    background: white;
                    border-radius: 0.5rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e5e7eb;
                    padding: 1.5rem;
                    position: relative;
                }
                
                .upload-header {
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
                
                .upload-icon {
                    width: 1.25rem;
                    height: 1.25rem;
                    color: #6b7280;
                }
                
                .drop-zone {
                    border: 2px dashed #d1d5db;
                    border-radius: 0.5rem;
                    padding: 3rem 2rem;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    background: #f9fafb;
                }
                
                .drop-zone:hover {
                    border-color: #9ca3af;
                    background: #f3f4f6;
                }
                
                .drop-zone.drag-over {
                    border-color: #3b82f6;
                    background: #eff6ff;
                    transform: scale(1.02);
                }
                
                .drop-zone-icon {
                    width: 3rem;
                    height: 3rem;
                    color: #9ca3af;
                    margin: 0 auto 1rem;
                }
                
                .drop-zone-text {
                    color: #6b7280;
                    margin-bottom: 1rem;
                }
                
                .file-input {
                    display: none;
                }
                
                .file-list {
                    margin-top: 1.5rem;
                    space-y: 0.75rem;
                }
                
                .file-item {
                    background: #f9fafb;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    border: 1px solid #e5e7eb;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                
                .file-preview {
                    width: 4rem;
                    height: 4rem;
                    object-fit: cover;
                    border-radius: 0.5rem;
                    border: 1px solid #d1d5db;
                    flex-shrink: 0;
                }
                
                .file-info {
                    flex: 1;
                    min-width: 0;
                }
                
                .file-name {
                    font-weight: 500;
                    color: #111827;
                    truncate: true;
                    margin-bottom: 0.25rem;
                }
                
                .file-details {
                    font-size: 0.875rem;
                    color: #6b7280;
                }
                
                .file-actions {
                    display: flex;
                    gap: 0.5rem;
                    flex-shrink: 0;
                }
                
                .btn-remove {
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 2rem;
                    height: 2rem;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .btn-remove:hover {
                    background: #dc2626;
                }
                
                .btn-select {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 0.375rem;
                    padding: 0.5rem 1rem;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    font-size: 0.875rem;
                }
                
                .btn-select:hover {
                    background: #2563eb;
                }
                
                .btn-select.current {
                    background: #10b981;
                }
                
                .btn-select.current:hover {
                    background: #059669;
                }
                
                .empty-state {
                    text-align: center;
                    color: #6b7280;
                    font-style: italic;
                    margin-top: 1rem;
                }
                
                @media (max-width: 640px) {
                    .upload-container {
                        padding: 1rem;
                    }
                    
                    .drop-zone {
                        padding: 2rem 1rem;
                    }
                    
                    .file-item {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.5rem;
                    }
                    
                    .file-actions {
                        align-self: flex-end;
                    }
                }
            </style>
            
            <div class="upload-container">
                <h2 class="upload-header">
                    <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                    </svg>
                    Your Photos
                </h2>
                
                <div class="drop-zone" id="drop-zone">
                    <svg class="drop-zone-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <p class="drop-zone-text">Drag & drop images here or click to browse</p>
                    <p style="font-size: 0.875rem; color: #9ca3af;">
                        Supports: JPG, PNG, GIF, WebP • 100% private - files never leave your device
                    </p>
                </div>
                
                <input type="file" id="file-input" class="file-input" multiple accept="image/*">
                
                <div class="file-list" id="file-list"></div>
            </div>
        `;
    }

    setupEventListeners() {
        const dropZone = this.shadowRoot.getElementById('drop-zone');
        const fileInput = this.shadowRoot.getElementById('file-input');

        // Click to upload
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(Array.from(e.target.files));
        });

        // Drag and drop
        dropZone.addEventListener('dragenter', this.handleDragEnter.bind(this));
        dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        dropZone.addEventListener('drop', this.handleDrop.bind(this));
    }

    setupStateSubscription() {
        appState.subscribe((state, changes) => {
            if (changes === 'images' || changes === 'currentImage' || Array.isArray(changes)) {
                this.updateFileList();
            }
        });
    }

    handleDragEnter(e) {
        e.preventDefault();
        this.isDragging = true;
        this.shadowRoot.getElementById('drop-zone').classList.add('drag-over');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }

    handleDragLeave(e) {
        e.preventDefault();
        if (!e.relatedTarget || !this.shadowRoot.contains(e.relatedTarget)) {
            this.isDragging = false;
            this.shadowRoot.getElementById('drop-zone').classList.remove('drag-over');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        this.isDragging = false;
        this.shadowRoot.getElementById('drop-zone').classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type.startsWith('image/')
        );
        
        if (files.length > 0) {
            this.handleFiles(files);
        }
    }

    async handleFiles(files) {
        const validFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (validFiles.length === 0) {
            stateManager.setError('Please select valid image files');
            return;
        }

        for (const file of validFiles) {
            try {
                await this.processFile(file);
            } catch (error) {
                console.error('Error processing file:', file.name, error);
                stateManager.setError(`Failed to process ${file.name}: ${error.message}`);
            }
        }
    }

    processFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    try {
                        stateManager.addImage(file, img);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                };
                
                img.onerror = () => {
                    reject(new Error('Failed to load image'));
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    updateFileList() {
        const fileList = this.shadowRoot.getElementById('file-list');
        
        if (appState.images.length === 0) {
            fileList.innerHTML = '<div class="empty-state">No images uploaded yet</div>';
            return;
        }

        fileList.innerHTML = appState.images.map(image => `
            <div class="file-item">
                <img src="${image.preview}" alt="${image.name}" class="file-preview">
                <div class="file-info">
                    <div class="file-name">${image.name}</div>
                    <div class="file-details">
                        ${this.formatFileSize(image.size)} • ${image.width}×${image.height}
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn-select ${image.id === appState.currentImage?.id ? 'current' : ''}" 
                            onclick="this.getRootNode().host.selectImage('${image.id}')">
                        ${image.id === appState.currentImage?.id ? 'Current' : 'Select'}
                    </button>
                    <button class="btn-remove" onclick="this.getRootNode().host.removeImage('${image.id}')" title="Remove">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    selectImage(imageId) {
        stateManager.setCurrentImage(imageId);
    }

    removeImage(imageId) {
        stateManager.removeImage(imageId);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}

customElements.define('image-uploader', ImageUploader);