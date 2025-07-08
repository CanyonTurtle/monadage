#!/usr/bin/env python3

import os
import sys
import json
import tempfile
import shutil
from pathlib import Path
from flask import Flask, request, jsonify, send_file, render_template_string
from flask_cors import CORS
from werkzeug.utils import secure_filename
import subprocess

# Add the parent directory to Python path for imports
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.insert(0, str(parent_dir))

# Change to parent directory for imports to work
os.chdir(parent_dir)

try:
    # Try relative import first (when run from monadage folder)
    from pipelines.registry import get_pipeline, list_pipelines
except ImportError:
    try:
        # Try absolute import (when run from outside monadage folder)
        from monadage.pipelines.registry import get_pipeline, list_pipelines
    except ImportError:
        # Last resort: try with adjusted path
        try:
            import importlib.util
            registry_path = parent_dir / "pipelines" / "registry.py"
            spec = importlib.util.spec_from_file_location("registry", registry_path)
            registry_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(registry_module)
            get_pipeline = registry_module.get_pipeline
            list_pipelines = registry_module.list_pipelines
        except Exception as e:
            print(f"Error: Could not import pipeline registry: {e}")
            print("Make sure you're running from the correct directory.")
            sys.exit(1)

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = tempfile.mkdtemp(prefix='monadage_uploads_')
OUTPUT_FOLDER = tempfile.mkdtemp(prefix='monadage_outputs_')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    """Serve the main application"""
    with open(current_dir / 'index.html', 'r') as f:
        return f.read()

@app.route('/app.js')
def app_js():
    """Serve the JavaScript application"""
    with open(current_dir / 'app.js', 'r') as f:
        content = f.read()
    return content, 200, {'Content-Type': 'application/javascript'}

@app.route('/api/pipelines', methods=['GET'])
def get_pipelines():
    """Get list of available pipelines"""
    try:
        pipelines_dict = list_pipelines()
        pipelines_list = [
            {'name': name, 'description': description}
            for name, description in pipelines_dict.items()
        ]
        return jsonify({
            'success': True,
            'pipelines': pipelines_list
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/upload', methods=['POST'])
def upload_files():
    """Upload files for processing"""
    try:
        if 'files' not in request.files:
            return jsonify({'success': False, 'error': 'No files provided'}), 400
        
        files = request.files.getlist('files')
        uploaded_files = []
        
        for file in files:
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                # Add timestamp to avoid collisions
                import time
                timestamp = str(int(time.time()))
                filename = f"{timestamp}_{filename}"
                
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                uploaded_files.append({
                    'filename': filename,
                    'original_name': file.filename,
                    'size': os.path.getsize(filepath)
                })
        
        return jsonify({
            'success': True,
            'files': uploaded_files
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/process', methods=['POST'])
def process_images():
    """Process images through the pipeline"""
    try:
        data = request.json
        files = data.get('files', [])
        pipeline_steps = data.get('pipeline', [])
        
        if not files or not pipeline_steps:
            return jsonify({
                'success': False,
                'error': 'Files and pipeline steps are required'
            }), 400
        
        # Create pipeline string
        pipeline_string = ','.join(pipeline_steps)
        
        # Process each file
        results = []
        for file_info in files:
            input_path = os.path.join(app.config['UPLOAD_FOLDER'], file_info['filename'])
            
            if not os.path.exists(input_path):
                continue
            
            # Generate output filename
            base_name = file_info['original_name'].rsplit('.', 1)[0]
            output_filename = f"{base_name}_{pipeline_string.replace(',', '_')}.png"
            output_path = os.path.join(app.config['OUTPUT_FOLDER'], output_filename)
            
            try:
                # Get pipeline instance
                pipeline = get_pipeline(pipeline_steps)
                
                # Process the image
                pipeline.process_image(Path(input_path), Path(output_path))
                
                if os.path.exists(output_path):
                    results.append({
                        'original_name': file_info['original_name'],
                        'processed_name': output_filename,
                        'pipeline': pipeline_string,
                        'size': os.path.getsize(output_path)
                    })
                    
            except Exception as e:
                print(f"Error processing {file_info['filename']}: {e}")
                continue
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/download/<filename>')
def download_file(filename):
    """Download processed file"""
    try:
        filename = secure_filename(filename)
        filepath = os.path.join(app.config['OUTPUT_FOLDER'], filename)
        
        if os.path.exists(filepath):
            return send_file(filepath, as_attachment=True)
        else:
            return jsonify({'error': 'File not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/preview/<filename>')
def preview_file(filename):
    """Preview uploaded or processed file"""
    try:
        filename = secure_filename(filename)
        
        # Check upload folder first
        upload_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(upload_path):
            return send_file(upload_path)
        
        # Check output folder
        output_path = os.path.join(app.config['OUTPUT_FOLDER'], filename)
        if os.path.exists(output_path):
            return send_file(output_path)
        
        return jsonify({'error': 'File not found'}), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/cleanup', methods=['POST'])
def cleanup_files():
    """Clean up temporary files"""
    try:
        # Clean upload folder
        for filename in os.listdir(app.config['UPLOAD_FOLDER']):
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            os.remove(file_path)
        
        # Clean output folder
        for filename in os.listdir(app.config['OUTPUT_FOLDER']):
            file_path = os.path.join(app.config['OUTPUT_FOLDER'], filename)
            os.remove(file_path)
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def cleanup_temp_dirs():
    """Clean up temporary directories on exit"""
    try:
        shutil.rmtree(UPLOAD_FOLDER, ignore_errors=True)
        shutil.rmtree(OUTPUT_FOLDER, ignore_errors=True)
    except:
        pass

if __name__ == '__main__':
    import atexit
    atexit.register(cleanup_temp_dirs)
    
    print(f"🎨 Monadage Web Interface Starting...")
    print(f"📁 Upload folder: {UPLOAD_FOLDER}")
    print(f"📁 Output folder: {OUTPUT_FOLDER}")
    print(f"🌐 Open your browser to: http://localhost:5000")
    
    try:
        app.run(debug=True, host='0.0.0.0', port=5000)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        cleanup_temp_dirs()
        sys.exit(0)