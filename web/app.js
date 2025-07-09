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
                { name: 'glitch_art', description: 'Digital glitch art' }
            ];
            console.log('Using error fallback pipelines:', this.pipelines);
        }
        
        // Enable the add step button now that pipelines are loaded
        this.addStepBtn.disabled = false;
        this.updateAddButton();
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
            this.updateAddButton();
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
                            onclick="pipelineEditor.removeFile(${index})"
                            aria-label="Remove ${file.name} from upload list"
                            title="Remove file">×</button>
                </div>
                <div class="flex items-center gap-3">
                    <img src="${previewUrl}" alt="Preview of ${file.name}" 
                         class="w-16 h-16 object-cover rounded-lg border border-gray-300 flex-shrink-0">
                    <div class="flex-1 text-sm text-gray-600">
                        <div>Size: ${(file.size / 1024).toFixed(1)} KB</div>
                        <div>Type: ${file.type}</div>
                    </div>
                </div>
            `;
            fileItem.setAttribute('role', 'listitem');
            fileItem.setAttribute('aria-label', `Uploaded file: ${file.name}`);
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
        this.updateAddButton();
        this.saveStateToURL();
    }


    togglePipelineDropdown(stepId) {
        const dropdown = document.getElementById(`dropdown-${stepId}`);
        const button = document.querySelector(`#pipeline-selector-${stepId} button`);
        const stepContainer = dropdown.closest('.relative');
        const isHidden = dropdown.classList.contains('hidden');
        
        // Close all other dropdowns
        document.querySelectorAll('.pipeline-dropdown').forEach(d => {
            if (d.id !== `dropdown-${stepId}`) {
                d.classList.add('hidden');
            }
        });
        
        // Toggle this dropdown
        if (isHidden) {
            // Position dropdown relative to button within the step container
            const buttonRect = button.getBoundingClientRect();
            const containerRect = stepContainer.getBoundingClientRect();
            
            // Calculate initial position relative to container
            let top = buttonRect.bottom - containerRect.top + 8;
            let left = buttonRect.left - containerRect.left;
            
            // Show dropdown temporarily to get its dimensions
            dropdown.style.visibility = 'hidden';
            dropdown.classList.remove('hidden');
            const dropdownRect = dropdown.getBoundingClientRect();
            dropdown.classList.add('hidden');
            dropdown.style.visibility = 'visible';
            
            // Check viewport boundaries and adjust position
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // Adjust horizontal position if dropdown goes off-screen
            if (buttonRect.left + dropdownRect.width > viewportWidth) {
                // Move dropdown to the left to fit in viewport
                left = buttonRect.right - containerRect.left - dropdownRect.width;
            }
            
            // Adjust vertical position if dropdown goes off-screen
            if (buttonRect.bottom + dropdownRect.height > viewportHeight) {
                // Show dropdown above the button instead
                top = buttonRect.top - containerRect.top - dropdownRect.height - 8;
            }
            
            dropdown.style.top = `${top}px`;
            dropdown.style.left = `${left}px`;
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
        this.updateAddButton();
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
                    <p>No effects added yet.</p>
                    <p class="text-sm">Click "Add an effect" to start transforming your photos.</p>
                </div>
            `;
        } else {
            // Create the pipeline flow
            const pipelineContainer = document.createElement('div');
            pipelineContainer.className = 'space-y-4';
            
            // Pipeline steps
            this.pipeline.forEach((step, index) => {
                const stepRow = this.createPipelineStepRow(step, index);
                pipelineContainer.appendChild(stepRow);
            });
            
            this.pipelineBuilder.appendChild(pipelineContainer);
        }
    }
    
    createPipelineStepRow(step, index) {
        const selectedPipeline = this.pipelines.find(p => p.name === step.pipeline);
        const displayPipelineName = selectedPipeline ? selectedPipeline.name : 'unknown';
        const pipelineDescription = selectedPipeline ? selectedPipeline.description : 'Unknown pipeline';
        
        // Pipeline card with half-image layout taking full width
        const cardSide = document.createElement('div');
        cardSide.className = 'bg-white border border-gray-200 rounded-lg shadow-sm cursor-move min-w-0 relative';
        cardSide.draggable = true;
        cardSide.dataset.stepId = step.id;
        cardSide.setAttribute('role', 'listitem');
        cardSide.setAttribute('aria-label', `Effect: ${this.formatPipelineName(step.pipeline)}`);
        
        cardSide.innerHTML = `
            <div class="flex h-32 overflow-hidden rounded-lg">
                <!-- Left side: Square image -->
                <div class="w-32 h-32 relative flex-shrink-0">
                    <img src="/examples/source_${displayPipelineName}.png" 
                         alt="${displayPipelineName}" 
                         class="w-full h-full object-cover"
                         onerror="this.src='/examples/original.png'">
                    <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-2 py-1 text-center">
                        ${this.formatPipelineName(displayPipelineName)}
                    </div>
                </div>
                
                <!-- Right side: Content (takes remaining space) -->
                <div class="flex-1 p-2 sm:p-4 flex flex-col">
                    <div class="flex items-center gap-2 mb-2 sm:gap-3 sm:mb-3">
                        <div class="flex-1 relative" id="pipeline-selector-${step.id}">
                            <button class="w-full p-1.5 sm:p-2 border border-gray-300 rounded-lg bg-white text-left hover:bg-gray-50 transition-colors flex items-center justify-between font-medium text-gray-900 text-xs sm:text-sm" 
                                    onclick="pipelineEditor.togglePipelineDropdown(${step.id})">
                                <span class="truncate">${this.formatPipelineName(step.pipeline)}</span>
                                <svg class="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </button>
                        </div>
                        <button class="bg-gray-400 hover:bg-gray-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center transition-colors flex-shrink-0" 
                                onclick="pipelineEditor.removeStep(${step.id})" title="Remove step">
                            <svg class="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div class="text-xs text-gray-500 leading-relaxed flex-1 overflow-hidden">${pipelineDescription}</div>
                </div>
            </div>
        `;
        
        // Add dropdown outside the card structure
        const dropdownContainer = document.createElement('div');
        dropdownContainer.innerHTML = `
            <div class="pipeline-dropdown hidden absolute mt-2 p-2 border border-gray-200 rounded-lg bg-white shadow-lg overflow-auto z-50" id="dropdown-${step.id}" style="max-height: 60vh; width: calc(100vw - 3rem); max-width: 320px;">
                <div class="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2">
                    ${this.pipelines.map(p => `
                        <div class="pipeline-option ${p.name === step.pipeline ? 'selected' : ''} cursor-pointer bg-white border border-gray-200 rounded-md p-1.5 sm:p-2 text-center hover:shadow-md transition-all"
                             onclick="pipelineEditor.selectPipeline(${step.id}, '${p.name}')">
                            <div class="aspect-square mb-1">
                                <img src="/examples/source_${p.name}.png" 
                                     alt="${p.name}" 
                                     class="w-full h-full object-cover rounded-sm border border-gray-300"
                                     onerror="this.src='/examples/original.png'">
                            </div>
                            <div class="font-medium text-xs text-gray-900 truncate leading-tight">${this.formatPipelineName(p.name)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Create a container that includes both the card and dropdown
        const stepContainer = document.createElement('div');
        stepContainer.className = 'relative';
        stepContainer.appendChild(cardSide);
        stepContainer.appendChild(dropdownContainer.firstElementChild);
        
        // Add drag event listeners to the card
        cardSide.addEventListener('dragstart', this.handleDragStart.bind(this));
        cardSide.addEventListener('dragend', this.handleDragEnd.bind(this));
        
        return stepContainer;
    }

    updateAddButton() {
        const hasEffects = this.pipeline.length > 0;
        
        if (hasEffects) {
            // Secondary styling when there are already effects
            this.addStepBtn.className = 'w-full bg-gray-100 text-gray-700 border border-gray-300 font-medium py-3 md:py-4 px-6 rounded-lg transition-all duration-300 hover:bg-gray-200 mb-6 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300';
            this.addStepBtn.innerHTML = `
                <svg class="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                Add another effect
            `;
        } else {
            // Primary styling when there are no effects (current blue color)
            this.addStepBtn.className = 'w-full bg-blue-600 text-white font-medium py-3 md:py-4 px-6 rounded-lg transition-all duration-300 hover:bg-blue-700 mb-6 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300';
            this.addStepBtn.innerHTML = `
                <svg class="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                Add an effect
            `;
        }
    }

    updateProcessButton() {
        const hasFiles = this.files.length > 0;
        const hasPipeline = this.pipeline.length > 0;
        
        this.processBtn.disabled = !hasFiles || !hasPipeline;
        
        if (!hasFiles && !hasPipeline) {
            this.processBtn.textContent = 'Add photos and effects to transform';
        } else if (!hasFiles) {
            this.processBtn.textContent = 'Add photos to transform';
        } else if (!hasPipeline) {
            this.processBtn.textContent = 'Add effects to transform';
        } else {
            this.processBtn.innerHTML = `
                <svg class="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                Transform my photos
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

// Demo effect cycling
class DemoEffectCycler {
    constructor() {
        this.effects = [
            { name: 'vaporwave', displayName: 'Vaporwave', borderColor: 'border-purple-300' },
            { name: 'glitch_art', displayName: 'Glitch Art', borderColor: 'border-red-300' },
            { name: 'neon_edge', displayName: 'Neon Edge', borderColor: 'border-cyan-300' },
            { name: 'oil_painting', displayName: 'Oil Painting', borderColor: 'border-orange-300' },
            { name: 'pixel_sort', displayName: 'Pixel Sort', borderColor: 'border-green-300' },
            { name: 'kaleidoscope', displayName: 'Kaleidoscope', borderColor: 'border-pink-300' },
            { name: 'comic_book', displayName: 'Comic Book', borderColor: 'border-blue-300' },
            { name: 'crystal_refraction', displayName: 'Crystal Refraction', borderColor: 'border-emerald-300' },
            { name: 'liquid_metal', displayName: 'Liquid Metal', borderColor: 'border-slate-300' },
            { name: 'paper_cutout', displayName: 'Paper Cutout', borderColor: 'border-amber-300' },
            { name: 'digital_rain', displayName: 'Digital Rain', borderColor: 'border-lime-300' },
            { name: 'origami_fold', displayName: 'Origami Fold', borderColor: 'border-rose-300' },
        ];
        this.currentIndex = 0;
        this.imageElement = document.getElementById('demo-effect-image');
        this.nameElement = document.getElementById('demo-effect-name');
        this.preloadedImages = new Map();
        
        if (this.imageElement && this.nameElement) {
            this.preloadAllImages();
            this.startCycling();
        }
    }
    
    preloadAllImages() {
        // Preload all effect images to prevent flickering
        this.effects.forEach(effect => {
            const img = new Image();
            img.src = `/examples/source_${effect.name}.png`;
            this.preloadedImages.set(effect.name, img);
        });
    }
    
    startCycling() {
        setInterval(() => {
            this.cycleToNext();
        }, 2000);
    }
    
    cycleToNext() {
        // Fade out
        this.imageElement.style.opacity = '0';
        this.nameElement.style.opacity = '0';
        
        setTimeout(() => {
            // Move to next effect
            this.currentIndex = (this.currentIndex + 1) % this.effects.length;
            const effect = this.effects[this.currentIndex];
            
            // Update image and text
            this.imageElement.src = `/examples/source_${effect.name}.png`;
            this.imageElement.className = `w-24 h-24 md:w-32 md:h-32 object-cover rounded-lg border-2 ${effect.borderColor} shadow-sm transition-opacity duration-500`;
            this.nameElement.textContent = effect.displayName;
            
            // Fade in
            this.imageElement.style.opacity = '1';
            this.nameElement.style.opacity = '1';
        }, 250); // Half of transition duration
    }
}

// Initialize demo cycler
const demoCycler = new DemoEffectCycler();

// Close dropdowns when clicking outside
document.addEventListener('click', (event) => {
    if (!event.target.closest('.pipeline-dropdown') && !event.target.closest('button')) {
        document.querySelectorAll('.pipeline-dropdown').forEach(dropdown => {
            dropdown.classList.add('hidden');
        });
    }
});