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
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));

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
            
            if (data.success) {
                this.pipelines = data.pipelines;
            } else {
                console.error('Failed to load pipelines:', data.error);
                // Fallback to hardcoded list
                this.pipelines = [
                    { name: 'cool_variations', description: 'Random cool variations with quantization and effects' },
                    { name: 'glitch_art', description: 'Digital glitch art with corruption effects' },
                    { name: 'vaporwave', description: 'Retro vaporwave aesthetic' },
                    { name: 'neon_edge', description: 'Neon edge lighting on dark backgrounds' }
                ];
            }
        } catch (error) {
            console.error('Error loading pipelines:', error);
            // Fallback to hardcoded list
            this.pipelines = [
                { name: 'cool_variations', description: 'Random cool variations' },
                { name: 'glitch_art', description: 'Digital glitch art' }
            ];
        }
    }

    loadStateFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const stepsParam = urlParams.get('steps');
        
        if (stepsParam) {
            const steps = stepsParam.split(',').filter(step => step.trim());
            this.pipeline = [];
            this.stepCounter = 0;
            
            steps.forEach(stepName => {
                const pipeline = this.pipelines.find(p => p.name === stepName.trim());
                if (pipeline) {
                    this.addPipelineStep(stepName.trim());
                }
            });
        }
    }

    saveStateToURL() {
        const steps = this.pipeline.map(step => step.pipeline).join(',');
        const url = new URL(window.location);
        
        if (steps) {
            url.searchParams.set('steps', steps);
        } else {
            url.searchParams.delete('steps');
        }
        
        window.history.replaceState({}, '', url);
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('border-purple-600', 'bg-blue-50');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('border-purple-600', 'bg-blue-50');
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        this.addFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.addFiles(files);
    }

    addFiles(files) {
        files.forEach(file => {
            if (!this.files.find(f => f.name === file.name && f.size === file.size)) {
                this.files.push(file);
            }
        });
        this.updateFileList();
        this.updateProcessButton();
    }

    removeFile(index) {
        this.files.splice(index, 1);
        this.updateFileList();
        this.updateProcessButton();
    }

    updateFileList() {
        this.fileList.innerHTML = '';
        this.files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
            fileItem.innerHTML = `
                <span class="font-medium text-gray-700 truncate flex-1 mr-3">${file.name}</span>
                <button class="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors flex-shrink-0" 
                        onclick="pipelineEditor.removeFile(${index})">×</button>
            `;
            this.fileList.appendChild(fileItem);
        });
    }

    addPipelineStep(pipelineName = null) {
        const stepId = ++this.stepCounter;
        const step = {
            id: stepId,
            pipeline: pipelineName || (this.pipelines.length > 0 ? this.pipelines[0].name : 'cool_variations')
        };
        
        this.pipeline.push(step);
        this.renderPipelineStep(step);
        this.updateProcessButton();
        this.saveStateToURL();
    }

    renderPipelineStep(step) {
        const stepElement = document.createElement('div');
        stepElement.className = 'bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-xl mb-4 cursor-move transition-all duration-300 hover:-translate-y-1 hover:shadow-lg';
        stepElement.draggable = true;
        stepElement.dataset.stepId = step.id;
        
        // Clear the "no steps" message
        if (this.pipeline.length === 1) {
            this.pipelineBuilder.innerHTML = '';
        }

        const stepIndex = this.pipeline.findIndex(s => s.id === step.id);
        stepElement.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <div class="flex items-center">
                    <div class="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm mr-3">
                        ${stepIndex + 1}
                    </div>
                    <strong class="text-sm md:text-base">Processing Step</strong>
                </div>
                <button class="bg-red-500/80 hover:bg-red-600/80 px-3 py-1 rounded-md text-sm transition-colors" 
                        onclick="pipelineEditor.removeStep(${step.id})">Remove</button>
            </div>
            <select class="w-full p-3 border-2 border-white/30 rounded-lg bg-white/10 text-white text-sm backdrop-blur-sm" 
                    onchange="pipelineEditor.updateStepPipeline(${step.id}, this.value)">
                ${this.pipelines.map(p => 
                    `<option value="${p.name}" ${p.name === step.pipeline ? 'selected' : ''} class="bg-gray-800 text-white">${p.name} - ${p.description}</option>`
                ).join('')}
            </select>
        `;

        // Add drag event listeners
        stepElement.addEventListener('dragstart', this.handleDragStart.bind(this));
        stepElement.addEventListener('dragend', this.handleDragEnd.bind(this));

        this.pipelineBuilder.appendChild(stepElement);
    }

    removeStep(stepId) {
        this.pipeline = this.pipeline.filter(step => step.id !== stepId);
        this.renderPipeline();
        this.updateProcessButton();
        this.saveStateToURL();
    }

    updateStepPipeline(stepId, pipelineName) {
        const step = this.pipeline.find(s => s.id === stepId);
        if (step) {
            step.pipeline = pipelineName;
            this.saveStateToURL();
        }
    }

    renderPipeline() {
        this.pipelineBuilder.innerHTML = '';
        if (this.pipeline.length === 0) {
            this.pipelineBuilder.innerHTML = `
                <p class="text-gray-500 text-center mt-12 md:mt-16">
                    No processing steps added yet.<br>
                    Click "Add Processing Step" to start building your pipeline.
                </p>
            `;
        } else {
            this.pipeline.forEach(step => this.renderPipelineStep(step));
        }
    }

    setupSortable() {
        let draggedElement = null;

        this.pipelineBuilder.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(this.pipelineBuilder, e.clientY);
            if (afterElement == null) {
                this.pipelineBuilder.appendChild(draggedElement);
            } else {
                this.pipelineBuilder.insertBefore(draggedElement, afterElement);
            }
        });
    }

    handleDragStart(e) {
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('opacity-50', 'rotate-2');
        e.dataTransfer.setData('text/html', e.target.outerHTML);
        
        // Store reference for reordering
        const stepId = parseInt(e.target.dataset.stepId);
        const stepIndex = this.pipeline.findIndex(s => s.id === stepId);
        e.dataTransfer.setData('text/plain', stepIndex);
    }

    handleDragEnd(e) {
        e.target.classList.remove('opacity-50', 'rotate-2');
        this.reorderPipeline();
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('[draggable="true"]:not(.opacity-50)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    reorderPipeline() {
        const stepElements = [...this.pipelineBuilder.querySelectorAll('[data-step-id]')];
        const newOrder = stepElements.map(el => {
            const stepId = parseInt(el.dataset.stepId);
            return this.pipeline.find(s => s.id === stepId);
        }).filter(Boolean);
        
        this.pipeline = newOrder;
        this.renderPipeline();
        this.saveStateToURL();
    }

    updateProcessButton() {
        const hasFiles = this.files.length > 0;
        const hasPipeline = this.pipeline.length > 0;
        this.processBtn.disabled = !(hasFiles && hasPipeline);
    }

    async processImages() {
        if (this.files.length === 0 || this.pipeline.length === 0) return;

        this.showStatus('processing', '🔄 Uploading and processing images...');
        this.processBtn.disabled = true;

        try {
            // First, upload files
            const formData = new FormData();
            this.files.forEach(file => {
                formData.append('files', file);
            });

            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const uploadData = await uploadResponse.json();
            if (!uploadData.success) {
                throw new Error(uploadData.error);
            }

            this.showStatus('processing', '🔄 Processing images through pipeline...');

            // Then process through pipeline
            const pipelineSteps = this.pipeline.map(step => step.pipeline);
            const processResponse = await fetch('/api/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: uploadData.files,
                    pipeline: pipelineSteps
                })
            });

            const processData = await processResponse.json();
            if (!processData.success) {
                throw new Error(processData.error);
            }

            this.processedResults = processData.results;
            this.showStatus('success', '✅ Processing completed successfully!');
            this.showResults();
            
        } catch (error) {
            this.showStatus('error', `❌ Error: ${error.message}`);
        } finally {
            this.processBtn.disabled = false;
        }
    }

    showStatus(type, message) {
        this.status.classList.remove('hidden');
        this.status.className = `mt-6 p-4 rounded-xl text-center font-medium ${
            type === 'processing' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
            type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' :
            'bg-red-100 text-red-800 border border-red-300'
        }`;
        this.status.textContent = message;
    }

    showResults() {
        this.results.classList.remove('hidden');
        this.resultGrid.innerHTML = '';
        
        this.processedResults.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow';
            resultItem.innerHTML = `
                <img src="/api/preview/${encodeURIComponent(result.processed_name)}" 
                     alt="${result.processed_name}" 
                     class="w-full h-48 object-cover">
                <div class="p-4">
                    <div class="font-semibold text-gray-800 mb-2 text-sm truncate">${result.processed_name}</div>
                    <div class="text-gray-600 text-xs mb-2">
                        Pipeline: ${result.pipeline}
                    </div>
                    <div class="text-gray-500 text-xs mb-3">
                        Size: ${(result.size / 1024).toFixed(1)} KB
                    </div>
                    <a href="/api/download/${encodeURIComponent(result.processed_name)}" 
                       class="inline-block bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                        📥 Download
                    </a>
                </div>
            `;
            this.resultGrid.appendChild(resultItem);
        });
        
        // Scroll to results
        this.results.scrollIntoView({ behavior: 'smooth' });
    }
}

// Initialize the application
const pipelineEditor = new PipelineEditor();