#!/usr/bin/env python3

import os
import sys
import json
import tempfile
import shutil
import webbrowser
from pathlib import Path
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Add current directory to path for local imports
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def create_web_app():
    """Create and configure the Flask web application"""
    try:
        # Import pipeline registry
        from pipelines.registry import get_pipeline, list_pipelines
    except ImportError:
        try:
            # Try with adjusted path
            import importlib.util
            registry_path = current_dir / "pipelines" / "registry.py"
            spec = importlib.util.spec_from_file_location("registry", registry_path)
            registry_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(registry_module)
            get_pipeline = registry_module.get_pipeline
            list_pipelines = registry_module.list_pipelines
        except Exception as e:
            print(f"Error: Could not import pipeline registry: {e}")
            print("Make sure you're running from the monadage directory.")
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
        web_dir = current_dir / 'web'
        return send_from_directory(web_dir, 'index.html')

    @app.route('/app.js')
    def app_js():
        """Serve the JavaScript application"""
        web_dir = current_dir / 'web'
        return send_from_directory(web_dir, 'app.js')

    @app.route('/examples/<filename>')
    def serve_example(filename):
        """Serve example images"""
        try:
            filename = secure_filename(filename)
            examples_dir = current_dir / 'web' / 'examples' / 'output'
            return send_from_directory(examples_dir, filename)
        except Exception as e:
            return jsonify({'error': str(e)}), 404

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
                
                # Get pipeline instance first to get correct filename
                pipeline = get_pipeline(pipeline_steps)
                
                # Generate output filename using pipeline's naming convention
                base_name = file_info['original_name'].rsplit('.', 1)[0]
                output_filename = f"{base_name}{pipeline.get_output_suffix()}{pipeline.get_output_extension()}"
                output_path = os.path.join(app.config['OUTPUT_FOLDER'], output_filename)
                
                try:
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

    @app.route('/api/download/<path:filename>')
    def download_file(filename):
        """Download processed file"""
        try:
            from urllib.parse import unquote
            # URL decode the filename first
            decoded_filename = unquote(filename)
            
            # Don't use secure_filename as it changes the filename - just validate the path
            if '..' in decoded_filename or '/' in decoded_filename or '\\' in decoded_filename:
                return jsonify({'error': 'Invalid filename'}), 400
            
            filepath = os.path.join(app.config['OUTPUT_FOLDER'], decoded_filename)
            
            if os.path.exists(filepath):
                return send_file(filepath, as_attachment=True)
            else:
                # Debug: list what files actually exist
                existing_files = os.listdir(app.config['OUTPUT_FOLDER'])
                print(f"File not found: '{decoded_filename}'")
                print(f"Existing files: {existing_files}")
                return jsonify({
                    'error': 'File not found',
                    'requested': decoded_filename,
                    'available': existing_files
                }), 404
                
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/preview/<path:filename>')
    def preview_file(filename):
        """Preview uploaded or processed file"""
        try:
            from urllib.parse import unquote
            # URL decode the filename first
            decoded_filename = unquote(filename)
            
            # Basic path validation
            if '..' in decoded_filename or '/' in decoded_filename or '\\' in decoded_filename:
                return jsonify({'error': 'Invalid filename'}), 400
            
            # Check upload folder first
            upload_path = os.path.join(app.config['UPLOAD_FOLDER'], decoded_filename)
            if os.path.exists(upload_path):
                return send_file(upload_path)
            
            # Check output folder
            output_path = os.path.join(app.config['OUTPUT_FOLDER'], decoded_filename)
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

    # Store cleanup function on app for external access
    app.cleanup_temp_dirs = cleanup_temp_dirs
    
    return app

def run_web_server(host='0.0.0.0', port=5000, debug=False, open_browser=True):
    """Run the web server"""
    import atexit
    
    app = create_web_app()
    atexit.register(app.cleanup_temp_dirs)
    
    print(f"🎨 Monadage Web Interface Starting...")
    print(f"🌐 Server running at: http://localhost:{port}")
    print(f"📁 Upload folder: {app.config['UPLOAD_FOLDER']}")
    print(f"📁 Output folder: {app.config['OUTPUT_FOLDER']}")
    
    if open_browser:
        import threading
        import time
        def open_browser_delayed():
            time.sleep(1.5)  # Wait for server to start
            try:
                webbrowser.open(f'http://localhost:{port}')
                print(f"🚀 Opened browser to http://localhost:{port}")
            except:
                print(f"💡 Open your browser to: http://localhost:{port}")
        
        threading.Thread(target=open_browser_delayed, daemon=True).start()
    
    try:
        app.run(debug=debug, host=host, port=port, use_reloader=False)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        app.cleanup_temp_dirs()
        sys.exit(0)

if __name__ == '__main__':
    run_web_server()