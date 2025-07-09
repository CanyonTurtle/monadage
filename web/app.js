class PipelineEditor {
    constructor() {
        this.files = [];
        this.pipeline = [];
        this.stepCounter = 0;
        this.pipelines = [];
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadAvailablePipelines().then(() => {
            this.loadStateFromURL();
        });
    }

    initializeElements() {
        this.uploadArea = document.getElementById('upload-area');
        this.uploadDropZone = document.getElementById('upload-drop-zone');
        this.dropOverlay = document.getElementById('drop-overlay');
        this.fileInput = document.getElementById('file-input');
        this.fileList = document.getElementById('file-list');
        this.pipelineBuilder = document.getElementById('pipeline-builder');
        this.addStepBtn = document.getElementById('add-step');
        this.processBtn = document.getElementById('process-btn');
        this.status = document.getElementById('status');
        this.results = document.getElementById('results');
        this.resultGrid = document.getElementById('result-grid');
    }

    setupEventListeners() {
        // File upload handlers
        this.uploadDropZone.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Global drag and drop handlers
        document.addEventListener('dragenter', this.handleDocumentDragEnter.bind(this));
        document.addEventListener('dragover', this.handleDocumentDragOver.bind(this));
        document.addEventListener('dragleave', this.handleDocumentDragLeave.bind(this));
        document.addEventListener('drop', this.handleDocumentDrop.bind(this));

        // Pipeline builder handlers
        this.addStepBtn.addEventListener('click', this.addPipelineStep.bind(this));
        this.processBtn.addEventListener('click', this.processImages.bind(this));

        // URL state management
        window.addEventListener('popstate', this.loadStateFromURL.bind(this));

        // Make pipeline builder sortable
        this.setupSortable();
    }

    async loadAvailablePipelines() {
        try {
            const response = await fetch('/api/pipelines');
            const data = await response.json();
            
            console.log('Pipeline API response:', data);
            
            if (data.success) {
                this.pipelines = data.pipelines;
                console.log('Loaded pipelines:', this.pipelines);
            } else {
                console.error('Failed to load pipelines:', data.error);
                // Fallback to hardcoded list
                this.pipelines = [
                    { name: 'cool_variations', description: 'Random cool variations with quantization and effects' },
                    { name: 'glitch_art', description: 'Digital glitch art with corruption effects' },
                    { name: 'vaporwave', description: 'Retro vaporwave aesthetic' },
                    { name: 'neon_edge', description: 'Neon edge lighting on dark backgrounds' }
                ];
                console.log('Using fallback pipelines:', this.pipelines);
            }
        } catch (error) {
            console.error('Error loading pipelines:', error);
            // Fallback to hardcoded list
            this.pipelines = [
                { name: 'cool_variations', description: 'Random cool variations' },
                { name: 'glitch_art', description: 'Digital glitch art' }
            ];
            console.log('Using error fallback pipelines:', this.pipelines);
        }
        
        // Enable the add step button now that pipelines are loaded
        this.addStepBtn.disabled = false;
        console.log('Pipeline loading complete. Add step button enabled.');
    }

    loadStateFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const stepsParam = urlParams.get('steps');
        
        if (stepsParam) {
            const steps = stepsParam.split(',').filter(step => step.trim());
            this.pipeline = [];
            this.stepCounter = 0;
            
            steps.forEach(stepName => {
                const trimmedName = stepName.trim();
                // Check if this is a valid pipeline name
                const pipeline = this.pipelines.find(p => p.name === trimmedName);
                if (pipeline) {
                    this.addPipelineStep(trimmedName);
                } else {
                    // If pipeline doesn't exist, still add it but it will use the first available pipeline
                    console.warn(`Pipeline '${trimmedName}' not found, using default`);
                    this.addPipelineStep();
                }
            });
        }
    }

    saveStateToURL() {
        const pipelineNames = this.pipeline.map(step => step.pipeline);
        const urlParams = new URLSearchParams();
        if (pipelineNames.length > 0) {
            urlParams.set('steps', pipelineNames.join(','));
        }
        
        const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
        window.history.pushState({}, '', newUrl);
    }

    // Helper function to format pipeline names for display
    formatPipelineName(name) {
        return name.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    }

    // File handling methods
    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        this.addFiles(files);
    }

    handleDocumentDragEnter(event) {
        // Only handle file drops, not pipeline step drops
        if (event.dataTransfer.types.includes('Files')) {
            event.preventDefault();
            this.dropOverlay.style.opacity = '1';
            this.dropOverlay.style.pointerEvents = 'auto';
        }
    }

    handleDocumentDragOver(event) {
        // Only handle file drops, not pipeline step drops
        if (event.dataTransfer.types.includes('Files')) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
        }
    }

    handleDocumentDragLeave(event) {
        // Only handle file drops, not pipeline step drops
        if (event.dataTransfer.types.includes('Files')) {
            event.preventDefault();
            if (!event.relatedTarget || !document.contains(event.relatedTarget)) {
                this.dropOverlay.style.opacity = '0';
                this.dropOverlay.style.pointerEvents = 'none';
            }
        }
    }

    handleDocumentDrop(event) {
        // Only handle file drops, not pipeline step drops
        if (event.dataTransfer.types.includes('Files')) {
            event.preventDefault();
            this.dropOverlay.style.opacity = '0';
            this.dropOverlay.style.pointerEvents = 'none';
            
            const files = Array.from(event.dataTransfer.files).filter(file => file.type.startsWith('image/'));
            if (files.length > 0) {
                this.addFiles(files);
            }
        }
    }

    addFiles(files) {
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                this.files.push(file);
            }
        });
        
        this.updateFileList();
        this.updateProcessButton();
    }

    removeFile(index) {
        // Clean up object URL if it exists
        const fileItem = this.fileList.children[index];
        if (fileItem) {
            const img = fileItem.querySelector('img');
            if (img && img.src.startsWith('blob:')) {
                URL.revokeObjectURL(img.src);
            }
        }
        
        this.files.splice(index, 1);
        this.updateFileList();
        this.updateProcessButton();
    }

    updateFileList() {
        // Clean up existing object URLs
        this.fileList.querySelectorAll('img[src^="blob:"]').forEach(img => {
            URL.revokeObjectURL(img.src);
        });
        
        this.fileList.innerHTML = '';
        this.files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'bg-gray-50 rounded-lg p-4 mb-3 last:mb-0 border border-gray-200';
            
            // Create preview URL for the image
            const previewUrl = URL.createObjectURL(file);
            
            fileItem.innerHTML = `
                <div class="flex items-center justify-between mb-3">
                    <span class="font-medium text-gray-700 truncate flex-1 mr-3">${file.name}</span>
                    <button class="bg-gray-400 hover:bg-gray-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm transition-colors flex-shrink-0" 
                            onclick="pipelineEditor.removeFile(${index})">×</button>
                </div>
                <div class="flex items-center gap-3">
                    <img src="${previewUrl}" alt="${file.name}" 
                         class="w-16 h-16 object-cover rounded-lg border border-gray-300 flex-shrink-0">
                    <div class="flex-1 text-sm text-gray-600">
                        <div>Size: ${(file.size / 1024).toFixed(1)} KB</div>
                        <div>Type: ${file.type}</div>
                    </div>
                </div>
            `;
            this.fileList.appendChild(fileItem);
        });
    }

    // Pipeline step management
    addPipelineStep(pipelineName = null) {
        // Don't add steps if pipelines haven't loaded yet
        if (this.pipelines.length === 0) {
            console.warn('Pipelines not loaded yet, cannot add step');
            return;
        }
        
        const stepId = ++this.stepCounter;
        
        // Ensure we have a valid pipeline name
        let selectedPipeline = pipelineName;
        if (!selectedPipeline) {
            selectedPipeline = this.pipelines[0].name;
        }
        
        // Validate the pipeline name exists
        const pipelineExists = this.pipelines.some(p => p.name === selectedPipeline);
        if (!pipelineExists) {
            console.warn(`Pipeline '${selectedPipeline}' not found, using first available pipeline`);
            selectedPipeline = this.pipelines[0].name;
        }
        
        const step = {
            id: stepId,
            pipeline: selectedPipeline
        };
        
        this.pipeline.push(step);
        this.renderPipeline();
        this.updateProcessButton();
        this.saveStateToURL();
    }


    togglePipelineDropdown(stepId) {
        const dropdown = document.getElementById(`dropdown-${stepId}`);
        const isHidden = dropdown.classList.contains('hidden');
        
        // Close all other dropdowns
        document.querySelectorAll('.pipeline-dropdown').forEach(d => {
            if (d.id !== `dropdown-${stepId}`) {
                d.classList.add('hidden');
            }
        });
        
        // Toggle this dropdown
        if (isHidden) {
            dropdown.classList.remove('hidden');
        } else {
            dropdown.classList.add('hidden');
        }
    }

    selectPipeline(stepId, pipelineName) {
        const step = this.pipeline.find(s => s.id === stepId);
        if (step) {
            step.pipeline = pipelineName;
            this.saveStateToURL();
            
            // Re-render the step
            this.renderPipeline();
        }
    }

    removeStep(stepId) {
        this.pipeline = this.pipeline.filter(step => step.id !== stepId);
        this.renderPipeline();
        this.updateProcessButton();
        this.saveStateToURL();
    }

    renderPipeline() {
        this.pipelineBuilder.innerHTML = '';
        
        if (this.pipeline.length === 0) {
            this.pipelineBuilder.innerHTML = `
                <div class="text-gray-500 text-center mt-12 md:mt-16 space-y-2">
                    <svg class="mx-auto w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    <p>No processing steps added yet.</p>
                    <p class="text-sm">Click "Add processing step" to start building your pipeline.</p>
                </div>
            `;
        } else {
            // Create the unified pipeline flow
            const pipelineContainer = document.createElement('div');
            pipelineContainer.className = 'space-y-0';
            
            // Original image header
            const originalHeader = document.createElement('div');
            originalHeader.className = 'flex gap-6 mb-4';
            originalHeader.innerHTML = `
                <div class="flex-shrink-0 w-32 flex flex-col items-center">
                    <img src="/examples/original.png" 
                         alt="Original" 
                         class="w-20 h-20 object-cover rounded-lg border-2 border-gray-300">
                    <div class="text-xs text-gray-600 mt-1 text-center">Original</div>
                </div>
                <div class="flex-1 flex items-center">
                    <div class="text-sm text-gray-500 italic">Your image will be transformed through the pipeline steps below</div>
                </div>
            `;
            pipelineContainer.appendChild(originalHeader);
            
            // Funnel separator
            const funnelSeparator = document.createElement('div');
            funnelSeparator.className = 'flex gap-6 mb-4';
            funnelSeparator.innerHTML = `
                <div class="flex-shrink-0 w-32 flex justify-center">
                    <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
                    </svg>
                </div>
                <div class="flex-1"></div>
            `;
            pipelineContainer.appendChild(funnelSeparator);
            
            // Pipeline steps
            this.pipeline.forEach((step, index) => {
                const stepRow = this.createPipelineStepRow(step, index);
                pipelineContainer.appendChild(stepRow);
            });
            
            this.pipelineBuilder.appendChild(pipelineContainer);
        }
    }
    
    createPipelineStepRow(step, index) {
        const stepRow = document.createElement('div');
        stepRow.className = 'flex gap-6 mb-4';
        stepRow.dataset.stepId = step.id;
        
        const selectedPipeline = this.pipelines.find(p => p.name === step.pipeline);
        const displayPipelineName = selectedPipeline ? selectedPipeline.name : 'unknown';
        const pipelineDescription = selectedPipeline ? selectedPipeline.description : 'Unknown pipeline';
        
        // Left side: Preview image
        const previewSide = document.createElement('div');
        previewSide.className = 'flex-shrink-0 w-32 flex flex-col items-center';
        previewSide.innerHTML = `
            <img src="/examples/source_${displayPipelineName}.png" 
                 alt="${displayPipelineName}" 
                 class="w-20 h-20 object-cover rounded-lg border-2 border-blue-300"
                 onerror="this.src='/examples/original.png'">
            <div class="text-xs text-gray-600 mt-1 text-center">${this.formatPipelineName(displayPipelineName)}</div>
        `;
        
        // Right side: Pipeline card
        const cardSide = document.createElement('div');
        cardSide.className = 'flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm cursor-move min-w-0 overflow-hidden';
        cardSide.draggable = true;
        cardSide.dataset.stepId = step.id;
        
        cardSide.innerHTML = `
            <div class="flex items-center gap-3 mb-3">
                <div class="flex-1" id="pipeline-selector-${step.id}">
                    <button class="w-full p-3 border border-gray-300 rounded-lg bg-white text-left hover:bg-gray-50 transition-colors flex items-center justify-between font-medium text-gray-900" 
                            onclick="pipelineEditor.togglePipelineDropdown(${step.id})">
                        <span>${this.formatPipelineName(step.pipeline)}</span>
                        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </button>
                    <div class="pipeline-dropdown hidden mt-2 p-4 border border-gray-200 rounded-lg bg-white shadow-lg overflow-auto" id="dropdown-${step.id}" style="max-height: 400px;">
                        <div class="pipeline-grid">
                            ${this.pipelines.map(p => `
                                <div class="pipeline-option ${p.name === step.pipeline ? 'selected' : ''} cursor-pointer bg-white border border-gray-200 rounded-lg p-3 text-center hover:shadow-md transition-all"
                                     onclick="pipelineEditor.selectPipeline(${step.id}, '${p.name}')">
                                    <img src="/examples/source_${p.name}.png" 
                                         alt="${p.name}" 
                                         class="w-full h-20 object-cover rounded-md mb-2 border border-gray-300"
                                         onerror="this.src='/examples/original.png'">
                                    <div class="font-medium text-sm text-gray-900">${this.formatPipelineName(p.name)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <button class="bg-gray-400 hover:bg-gray-500 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors flex-shrink-0" 
                        onclick="pipelineEditor.removeStep(${step.id})" title="Remove step">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="text-sm text-gray-500 leading-relaxed">${pipelineDescription}</div>
        `;
        
        // Add drag event listeners to the card
        cardSide.addEventListener('dragstart', this.handleDragStart.bind(this));
        cardSide.addEventListener('dragend', this.handleDragEnd.bind(this));
        
        // Add arrow after this step (except for the last one)
        if (index < this.pipeline.length - 1) {
            const arrowDiv = document.createElement('div');
            arrowDiv.className = 'flex gap-6 mb-2';
            arrowDiv.innerHTML = `
                <div class="flex-shrink-0 w-32 flex justify-center">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
                    </svg>
                </div>
                <div class="flex-1"></div>
            `;
            stepRow.appendChild(previewSide);
            stepRow.appendChild(cardSide);
            
            // Return a fragment with both the step and arrow
            const fragment = document.createDocumentFragment();
            fragment.appendChild(stepRow);
            fragment.appendChild(arrowDiv);
            return fragment;
        }
        
        stepRow.appendChild(previewSide);
        stepRow.appendChild(cardSide);
        return stepRow;
    }

    updateProcessButton() {
        const hasFiles = this.files.length > 0;
        const hasPipeline = this.pipeline.length > 0;
        
        this.processBtn.disabled = !hasFiles || !hasPipeline;
        
        if (!hasFiles && !hasPipeline) {
            this.processBtn.textContent = 'Add files and pipeline steps to process';
        } else if (!hasFiles) {
            this.processBtn.textContent = 'Add files to process';
        } else if (!hasPipeline) {
            this.processBtn.textContent = 'Add pipeline steps to process';
        } else {
            this.processBtn.innerHTML = `
                <svg class="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                Process images
            `;
        }
    }

    // Drag and drop for pipeline steps
    setupSortable() {
        this.pipelineBuilder.addEventListener('dragover', this.handleDragOver.bind(this));
        this.pipelineBuilder.addEventListener('drop', this.handleDrop.bind(this));
        this.pipelineBuilder.addEventListener('dragenter', this.handleDragEnter.bind(this));
    }

    handleDragStart(event) {
        event.dataTransfer.setData('text/plain', event.target.dataset.stepId);
        event.dataTransfer.effectAllowed = 'move';
        event.target.style.opacity = '0.5';
        
        // Add visual feedback to all other pipeline steps
        const allSteps = this.pipelineBuilder.querySelectorAll('[data-step-id]');
        allSteps.forEach(step => {
            if (step !== event.target) {
                step.style.borderColor = '#3b82f6';
                step.style.borderWidth = '2px';
                step.style.borderStyle = 'dashed';
            }
        });
    }

    handleDragEnd(event) {
        event.target.style.opacity = '1';
        
        // Remove visual feedback from all pipeline steps
        const allSteps = this.pipelineBuilder.querySelectorAll('[data-step-id]');
        allSteps.forEach(step => {
            step.style.borderColor = '';
            step.style.borderWidth = '';
            step.style.borderStyle = '';
        });
    }

    handleDragEnter(event) {
        event.preventDefault();
        const targetElement = event.target.closest('[data-step-id]');
        if (targetElement) {
            targetElement.style.backgroundColor = '#f3f4f6';
        }
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        // Clear any previous hover effects
        const allSteps = this.pipelineBuilder.querySelectorAll('[data-step-id]');
        allSteps.forEach(step => {
            step.style.backgroundColor = '';
        });
        
        // Add hover effect to current target
        const targetElement = event.target.closest('[data-step-id]');
        if (targetElement) {
            targetElement.style.backgroundColor = '#e5e7eb';
        }
    }

    handleDrop(event) {
        event.preventDefault();
        
        const draggedId = parseInt(event.dataTransfer.getData('text/plain'));
        const targetElement = event.target.closest('[data-step-id]');
        
        console.log('Drop event:', { draggedId, targetElement, targetId: targetElement?.dataset.stepId });
        
        // Clear all visual feedback
        const allSteps = this.pipelineBuilder.querySelectorAll('[data-step-id]');
        allSteps.forEach(step => {
            step.style.backgroundColor = '';
            step.style.borderColor = '';
            step.style.borderWidth = '';
            step.style.borderStyle = '';
        });
        
        if (targetElement && targetElement.dataset.stepId !== draggedId.toString()) {
            const targetId = parseInt(targetElement.dataset.stepId);
            
            // Find the steps
            const draggedIndex = this.pipeline.findIndex(s => s.id === draggedId);
            const targetIndex = this.pipeline.findIndex(s => s.id === targetId);
            
            console.log('Reordering:', { draggedIndex, targetIndex, draggedId, targetId });
            
            if (draggedIndex !== -1 && targetIndex !== -1) {
                // Reorder the pipeline
                const [draggedStep] = this.pipeline.splice(draggedIndex, 1);
                this.pipeline.splice(targetIndex, 0, draggedStep);
                
                console.log('Pipeline reordered successfully');
                
                // Re-render the entire pipeline to update both timeline and cards
                this.renderPipeline();
                this.saveStateToURL();
            }
        } else {
            console.log('No valid drop target or same element');
        }
    }

    // Image processing
    async processImages() {
        if (this.files.length === 0 || this.pipeline.length === 0) {
            return;
        }
        
        this.processBtn.disabled = true;
        this.showStatus('Uploading files...', 'info');
        
        try {
            // Upload files
            const uploadFormData = new FormData();
            this.files.forEach(file => {
                uploadFormData.append('files', file);
            });
            
            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                body: uploadFormData
            });
            
            const uploadData = await uploadResponse.json();
            
            if (!uploadData.success) {
                throw new Error(uploadData.error || 'Upload failed');
            }
            
            this.showStatus('Processing images...', 'info');
            
            // Process images
            const processResponse = await fetch('/api/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    files: uploadData.files,
                    pipeline: this.pipeline.map(step => step.pipeline)
                })
            });
            
            const processData = await processResponse.json();
            
            if (!processData.success) {
                throw new Error(processData.error || 'Processing failed');
            }
            
            this.showResults(processData.results);
            this.showStatus('Processing complete!', 'success');
            
        } catch (error) {
            console.error('Processing error:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
        } finally {
            this.processBtn.disabled = false;
            this.updateProcessButton();
        }
    }

    showStatus(message, type) {
        this.status.textContent = message;
        this.status.className = `mt-6 p-4 rounded-lg text-center font-medium ${
            type === 'success' ? 'bg-green-100 text-green-800' :
            type === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
        }`;
        this.status.classList.remove('hidden');
        
        if (type === 'success') {
            setTimeout(() => {
                this.status.classList.add('hidden');
            }, 5000);
        }
    }

    showResults(results) {
        this.resultGrid.innerHTML = '';
        
        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden';
            
            resultItem.innerHTML = `
                <div class="aspect-square">
                    <img src="/api/preview/${encodeURIComponent(result.processed_name)}" 
                         alt="${result.original_name}" 
                         class="w-full h-full object-cover">
                </div>
                <div class="p-4">
                    <div class="font-medium text-gray-900 truncate mb-1">${result.original_name}</div>
                    <div class="text-sm text-gray-500 mb-3">${(result.size / 1024).toFixed(1)} KB</div>
                    <a href="/api/download/${encodeURIComponent(result.processed_name)}" 
                       class="block w-full bg-gray-900 text-white text-center py-2 px-4 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium">
                        Download
                    </a>
                </div>
            `;
            
            this.resultGrid.appendChild(resultItem);
        });
        
        this.results.classList.remove('hidden');
    }
}

// Initialize the application
const pipelineEditor = new PipelineEditor();

// Close dropdowns when clicking outside
document.addEventListener('click', (event) => {
    if (!event.target.closest('.pipeline-dropdown') && !event.target.closest('button')) {
        document.querySelectorAll('.pipeline-dropdown').forEach(dropdown => {
            dropdown.classList.add('hidden');
        });
    }
});