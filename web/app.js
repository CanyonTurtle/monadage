class PipelineEditor {
    constructor() {
        this.files = [];
        this.pipeline = [];
        this.stepCounter = 0;
        this.pipelines = [];
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadAvailablePipelines();
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

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
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
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span class="name">${file.name}</span>
                <button class="remove" onclick="pipelineEditor.removeFile(${index})">×</button>
            `;
            this.fileList.appendChild(fileItem);
        });
    }

    addPipelineStep() {
        const stepId = ++this.stepCounter;
        const step = {
            id: stepId,
            pipeline: this.pipelines[0].name
        };
        
        this.pipeline.push(step);
        this.renderPipelineStep(step);
        this.updateProcessButton();
    }

    renderPipelineStep(step) {
        const stepElement = document.createElement('div');
        stepElement.className = 'pipeline-step';
        stepElement.draggable = true;
        stepElement.dataset.stepId = step.id;
        
        // Clear the "no steps" message
        if (this.pipeline.length === 1) {
            this.pipelineBuilder.innerHTML = '';
        }

        stepElement.innerHTML = `
            <div class="step-header">
                <div style="display: flex; align-items: center;">
                    <div class="step-number">${this.pipeline.indexOf(step) + 1}</div>
                    <strong>Processing Step</strong>
                </div>
                <div class="step-controls">
                    <button class="step-remove" onclick="pipelineEditor.removeStep(${step.id})">Remove</button>
                </div>
            </div>
            <select class="pipeline-select" onchange="pipelineEditor.updateStepPipeline(${step.id}, this.value)">
                ${this.pipelines.map(p => 
                    `<option value="${p.name}" ${p.name === step.pipeline ? 'selected' : ''}>${p.name} - ${p.description}</option>`
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
    }

    updateStepPipeline(stepId, pipelineName) {
        const step = this.pipeline.find(s => s.id === stepId);
        if (step) {
            step.pipeline = pipelineName;
        }
    }

    renderPipeline() {
        this.pipelineBuilder.innerHTML = '';
        if (this.pipeline.length === 0) {
            this.pipelineBuilder.innerHTML = `
                <p style="color: #666; text-align: center; margin-top: 50px;">
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
        e.target.classList.add('dragging');
        e.dataTransfer.setData('text/html', e.target.outerHTML);
        
        // Store reference for reordering
        const stepId = parseInt(e.target.dataset.stepId);
        const stepIndex = this.pipeline.findIndex(s => s.id === stepId);
        e.dataTransfer.setData('text/plain', stepIndex);
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.reorderPipeline();
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.pipeline-step:not(.dragging)')];
        
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
        const stepElements = [...this.pipelineBuilder.querySelectorAll('.pipeline-step')];
        const newOrder = stepElements.map(el => {
            const stepId = parseInt(el.dataset.stepId);
            return this.pipeline.find(s => s.id === stepId);
        }).filter(Boolean);
        
        this.pipeline = newOrder;
        this.renderPipeline();
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

    async simulateProcessing(pipelineString) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // For demo purposes, we'll create some mock results
        this.mockResults = this.files.map((file, index) => ({
            originalName: file.name,
            processedName: `${file.name.split('.')[0]}_${pipelineString.replace(/,/g, '_')}.png`,
            url: URL.createObjectURL(file), // Using original for demo
            pipeline: pipelineString
        }));
    }

    showStatus(type, message) {
        this.status.style.display = 'block';
        this.status.className = `status ${type}`;
        this.status.textContent = message;
    }

    showResults() {
        this.results.style.display = 'block';
        this.resultGrid.innerHTML = '';
        
        this.processedResults.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.innerHTML = `
                <img src="/api/preview/${result.processed_name}" alt="${result.processed_name}">
                <div class="info">
                    <div class="name">${result.processed_name}</div>
                    <div style="color: #666; font-size: 0.9em; margin: 5px 0;">
                        Pipeline: ${result.pipeline}
                    </div>
                    <div style="color: #999; font-size: 0.8em; margin: 5px 0;">
                        Size: ${(result.size / 1024).toFixed(1)} KB
                    </div>
                    <a href="/api/download/${result.processed_name}" class="download">
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