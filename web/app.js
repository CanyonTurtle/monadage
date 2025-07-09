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
        event.preventDefault();
        this.dropOverlay.style.opacity = '1';
        this.dropOverlay.style.pointerEvents = 'auto';
    }

    handleDocumentDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }

    handleDocumentDragLeave(event) {
        event.preventDefault();
        if (!event.relatedTarget || !document.contains(event.relatedTarget)) {
            this.dropOverlay.style.opacity = '0';
            this.dropOverlay.style.pointerEvents = 'none';
        }
    }

    handleDocumentDrop(event) {
        event.preventDefault();
        this.dropOverlay.style.opacity = '0';
        this.dropOverlay.style.pointerEvents = 'none';
        
        const files = Array.from(event.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        if (files.length > 0) {
            this.addFiles(files);
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
                    <button class="bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm transition-colors flex-shrink-0" 
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
        this.renderPipelineStep(step);
        this.updateProcessButton();
        this.saveStateToURL();
    }

    renderPipelineStep(step) {
        // Don't render if pipelines haven't loaded yet
        if (this.pipelines.length === 0) {
            console.warn('Pipelines not loaded yet, cannot render step');
            return;
        }
        
        const stepElement = document.createElement('div');
        stepElement.className = 'bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm';
        stepElement.draggable = true;
        stepElement.dataset.stepId = step.id;
        
        // Clear the "no steps" message
        if (this.pipeline.length === 1) {
            this.pipelineBuilder.innerHTML = '';
        }

        const stepIndex = this.pipeline.findIndex(s => s.id === step.id);
        const selectedPipeline = this.pipelines.find(p => p.name === step.pipeline);
        
        if (!selectedPipeline) {
            console.warn(`Pipeline '${step.pipeline}' not found in available pipelines:`, this.pipelines.map(p => p.name));
            console.warn('Available pipelines:', this.pipelines);
        }
        
        const pipelineDescription = selectedPipeline ? selectedPipeline.description : 'Unknown pipeline';
        
        // Ensure we have a valid pipeline name to display
        const displayPipelineName = selectedPipeline ? selectedPipeline.name : (this.pipelines[0] ? this.pipelines[0].name : 'Unknown');
        
        stepElement.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <div class="flex items-center min-w-0 flex-1">
                    <div class="bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center font-medium text-sm mr-3 flex-shrink-0 text-gray-700">
                        ${stepIndex + 1}
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="font-medium text-gray-900 truncate">${this.formatPipelineName(displayPipelineName)}</div>
                        <div class="text-sm text-gray-500 truncate">${pipelineDescription}</div>
                    </div>
                </div>
                <button class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm transition-colors flex-shrink-0 ml-3" 
                        onclick="pipelineEditor.removeStep(${step.id})">Remove</button>
            </div>
            <div class="mb-4" id="pipeline-selector-${step.id}">
                <button class="w-full p-3 border border-gray-300 rounded-lg bg-white text-left hover:bg-gray-50 transition-colors flex items-center justify-between" 
                        onclick="pipelineEditor.togglePipelineDropdown(${step.id})">
                    <span class="font-medium text-gray-900">${this.formatPipelineName(step.pipeline)}</span>
                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                </button>
                <div class="pipeline-dropdown hidden mt-2 p-4 border border-gray-200 rounded-lg bg-white shadow-lg" id="dropdown-${step.id}">
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
            <div class="flex items-center justify-center gap-4 text-sm text-gray-500">
                <div class="text-center">
                    <img src="/examples/original.png" 
                         alt="Original" 
                         class="w-16 h-16 object-cover rounded-lg border border-gray-300 mb-1">
                    <div>Original</div>
                </div>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
                <div class="text-center">
                    <img id="preview-${step.id}" src="/examples/source_${displayPipelineName}.png" 
                         alt="${displayPipelineName} preview" 
                         class="w-16 h-16 object-cover rounded-lg border border-gray-300 mb-1"
                         onerror="this.src='/examples/original.png'">
                    <div>${this.formatPipelineName(displayPipelineName)}</div>
                </div>
            </div>
        `;

        // Add drag event listeners
        stepElement.addEventListener('dragstart', this.handleDragStart.bind(this));
        stepElement.addEventListener('dragend', this.handleDragEnd.bind(this));

        this.pipelineBuilder.appendChild(stepElement);
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
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    <p>No processing steps added yet.</p>
                    <p class="text-sm">Click "Add processing step" to start building your pipeline.</p>
                </div>
            `;
        } else {
            this.pipeline.forEach(step => {
                this.renderPipelineStep(step);
            });
        }
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
    }

    handleDragStart(event) {
        event.dataTransfer.setData('text/plain', event.target.dataset.stepId);
        event.target.style.opacity = '0.5';
    }

    handleDragEnd(event) {
        event.target.style.opacity = '1';
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }

    handleDrop(event) {
        event.preventDefault();
        
        const draggedId = parseInt(event.dataTransfer.getData('text/plain'));
        const targetElement = event.target.closest('[data-step-id]');
        
        if (targetElement && targetElement.dataset.stepId !== draggedId.toString()) {
            const targetId = parseInt(targetElement.dataset.stepId);
            
            // Find the steps
            const draggedIndex = this.pipeline.findIndex(s => s.id === draggedId);
            const targetIndex = this.pipeline.findIndex(s => s.id === targetId);
            
            // Reorder the pipeline
            const [draggedStep] = this.pipeline.splice(draggedIndex, 1);
            this.pipeline.splice(targetIndex, 0, draggedStep);
            
            this.renderPipeline();
            this.saveStateToURL();
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