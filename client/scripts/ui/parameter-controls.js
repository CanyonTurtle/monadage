/**
 * Dynamic Parameter Controls Builder
 * Generates UI controls based on effect parameter schemas
 */

export class ParameterControlsBuilder {
    static createControl(paramName, paramConfig, currentValue, onValueChange) {
        const container = document.createElement('div');
        container.className = 'parameter-control mb-4';
        
        // Label
        const label = document.createElement('label');
        label.className = 'block text-sm font-medium text-gray-700 mb-2';
        label.textContent = paramConfig.label || paramName;
        label.setAttribute('for', `param-${paramName}`);
        
        // Help text
        if (paramConfig.description) {
            const help = document.createElement('p');
            help.className = 'text-xs text-gray-500 mb-2';
            help.textContent = paramConfig.description;
            container.appendChild(label);
            container.appendChild(help);
        } else {
            container.appendChild(label);
        }
        
        // Control based on type
        let control;
        switch (paramConfig.type) {
            case 'range':
                control = this.createRangeControl(paramName, paramConfig, currentValue, onValueChange);
                break;
            case 'select':
                control = this.createSelectControl(paramName, paramConfig, currentValue, onValueChange);
                break;
            case 'checkbox':
                control = this.createCheckboxControl(paramName, paramConfig, currentValue, onValueChange);
                break;
            case 'color':
                control = this.createColorControl(paramName, paramConfig, currentValue, onValueChange);
                break;
            default:
                control = this.createTextControl(paramName, paramConfig, currentValue, onValueChange);
        }
        
        container.appendChild(control);
        return container;
    }
    
    static createRangeControl(paramName, config, currentValue, onValueChange) {
        const wrapper = document.createElement('div');
        wrapper.className = 'range-control';
        
        // Range input
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = `param-${paramName}`;
        slider.className = 'w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer';
        slider.min = config.min || 0;
        slider.max = config.max || 100;
        slider.step = config.step || 1;
        slider.value = currentValue !== undefined ? currentValue : config.default;
        
        // Value display
        const valueDisplay = document.createElement('div');
        valueDisplay.className = 'flex justify-between text-sm text-gray-600 mt-1';
        
        const minLabel = document.createElement('span');
        minLabel.textContent = config.min || 0;
        
        const currentLabel = document.createElement('span');
        currentLabel.className = 'font-medium';
        currentLabel.textContent = slider.value;
        
        const maxLabel = document.createElement('span');
        maxLabel.textContent = config.max || 100;
        
        valueDisplay.appendChild(minLabel);
        valueDisplay.appendChild(currentLabel);
        valueDisplay.appendChild(maxLabel);
        
        // Event handling
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            currentLabel.textContent = value;
            onValueChange(paramName, value);
        });
        
        wrapper.appendChild(slider);
        wrapper.appendChild(valueDisplay);
        return wrapper;
    }
    
    static createSelectControl(paramName, config, currentValue, onValueChange) {
        const select = document.createElement('select');
        select.id = `param-${paramName}`;
        select.className = 'w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500';
        
        config.options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label || option.value;
            optionElement.selected = option.value === (currentValue !== undefined ? currentValue : config.default);
            select.appendChild(optionElement);
        });
        
        select.addEventListener('change', (e) => {
            onValueChange(paramName, e.target.value);
        });
        
        return select;
    }
    
    static createCheckboxControl(paramName, config, currentValue, onValueChange) {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `param-${paramName}`;
        checkbox.className = 'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded';
        checkbox.checked = currentValue !== undefined ? currentValue : config.default;
        
        const label = document.createElement('label');
        label.className = 'ml-2 block text-sm text-gray-900';
        label.textContent = config.label || paramName;
        label.setAttribute('for', `param-${paramName}`);
        
        checkbox.addEventListener('change', (e) => {
            onValueChange(paramName, e.target.checked);
        });
        
        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        return wrapper;
    }
    
    static createColorControl(paramName, config, currentValue, onValueChange) {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center space-x-2';
        
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.id = `param-${paramName}`;
        colorInput.className = 'h-10 w-20 border border-gray-300 rounded cursor-pointer';
        colorInput.value = currentValue !== undefined ? currentValue : config.default;
        
        const hexDisplay = document.createElement('input');
        hexDisplay.type = 'text';
        hexDisplay.className = 'flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500';
        hexDisplay.value = colorInput.value;
        hexDisplay.placeholder = '#ffffff';
        
        colorInput.addEventListener('change', (e) => {
            hexDisplay.value = e.target.value;
            onValueChange(paramName, e.target.value);
        });
        
        hexDisplay.addEventListener('change', (e) => {
            colorInput.value = e.target.value;
            onValueChange(paramName, e.target.value);
        });
        
        wrapper.appendChild(colorInput);
        wrapper.appendChild(hexDisplay);
        return wrapper;
    }
    
    static createTextControl(paramName, config, currentValue, onValueChange) {
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `param-${paramName}`;
        input.className = 'w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500';
        input.value = currentValue !== undefined ? currentValue : config.default || '';
        input.placeholder = config.placeholder || '';
        
        input.addEventListener('change', (e) => {
            onValueChange(paramName, e.target.value);
        });
        
        return input;
    }
}

export class EffectControlsPanel {
    constructor(container, effectRegistry, webglProcessor) {
        this.container = container;
        this.effectRegistry = effectRegistry;
        this.webglProcessor = webglProcessor;
        this.currentEffect = null;
        this.parameterValues = {};
    }
    
    showEffectControls(effectName) {
        const effect = this.effectRegistry.getEffect(effectName);
        if (!effect) return;
        
        this.currentEffect = effect;
        this.container.innerHTML = '';
        
        // Title
        const title = document.createElement('h3');
        title.className = 'text-lg font-semibold text-gray-900 mb-4';
        title.textContent = `${effect.displayName} Settings`;
        this.container.appendChild(title);
        
        // Description
        if (effect.description) {
            const desc = document.createElement('p');
            desc.className = 'text-sm text-gray-600 mb-6';
            desc.textContent = effect.description;
            this.container.appendChild(desc);
        }
        
        // Parameters
        const parametersContainer = document.createElement('div');
        parametersContainer.className = 'space-y-4';
        
        Object.entries(effect.parameters).forEach(([paramName, paramConfig]) => {
            const currentValue = this.parameterValues[paramName] !== undefined 
                ? this.parameterValues[paramName] 
                : paramConfig.default;
                
            const control = ParameterControlsBuilder.createControl(
                paramName, 
                paramConfig, 
                currentValue,
                (name, value) => this.updateParameter(name, value)
            );
            
            parametersContainer.appendChild(control);
        });
        
        this.container.appendChild(parametersContainer);
        
        // Reset button
        const resetButton = document.createElement('button');
        resetButton.className = 'mt-6 w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md transition duration-200';
        resetButton.textContent = 'Reset to Defaults';
        resetButton.addEventListener('click', () => this.resetToDefaults());
        
        this.container.appendChild(resetButton);
    }
    
    updateParameter(paramName, value) {
        this.parameterValues[paramName] = value;
        
        // Trigger effect update if we have a current effect
        if (this.currentEffect && this.webglProcessor) {
            this.applyCurrentEffect();
        }
    }
    
    resetToDefaults() {
        if (!this.currentEffect) return;
        
        this.parameterValues = {};
        Object.entries(this.currentEffect.parameters).forEach(([paramName, paramConfig]) => {
            this.parameterValues[paramName] = paramConfig.default;
        });
        
        // Rebuild the UI
        this.showEffectControls(this.currentEffect.name);
        
        // Apply effect with default values
        this.applyCurrentEffect();
    }
    
    applyCurrentEffect() {
        if (!this.currentEffect || !this.webglProcessor) return;
        
        try {
            this.webglProcessor.applyEffect(this.currentEffect.name, this.parameterValues);
        } catch (error) {
            console.error('Failed to apply effect:', error);
        }
    }
    
    getCurrentParameters() {
        return { ...this.parameterValues };
    }
    
    hide() {
        this.container.innerHTML = '';
        this.currentEffect = null;
    }
}