#!/usr/bin/env python3

import os
import sys
import argparse
from pathlib import Path

# Add both current directory and parent directory to path for imports
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.insert(0, str(current_dir))
sys.path.insert(0, str(parent_dir))

try:
    # Try relative import first (when run from inside monadage folder)
    from pipelines.registry import get_pipeline, list_pipelines
except ImportError:
    try:
        # Try absolute import (when run from outside monadage folder)
        from monadage.pipelines.registry import get_pipeline, list_pipelines
    except ImportError:
        # Last resort: try with adjusted path
        try:
            import importlib.util
            registry_path = current_dir / "pipelines" / "registry.py"
            spec = importlib.util.spec_from_file_location("registry", registry_path)
            registry_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(registry_module)
            get_pipeline = registry_module.get_pipeline
            list_pipelines = registry_module.list_pipelines
        except Exception as e:
            print(f"Error: Could not import pipeline registry: {e}")
            print("Make sure all required dependencies are installed and the pipelines folder exists.")
            sys.exit(1)


def process_images(input_folder: str, output_folder: str, pipeline_names: str, **pipeline_kwargs):
    """Process all images in input folder using specified pipeline(s)"""
    
    input_path = Path(input_folder)
    output_path = Path(output_folder)
    
    # Create output directory if it doesn't exist
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Parse pipeline names (comma-separated for composition)
    if ',' in pipeline_names:
        pipeline_list = [name.strip() for name in pipeline_names.split(',')]
    else:
        pipeline_list = pipeline_names
    
    # Get the pipeline instance (single or composite)
    try:
        pipeline = get_pipeline(pipeline_list, **pipeline_kwargs)
    except ValueError as e:
        print(f"Error: {e}")
        return False
    
    # Supported image extensions
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp'}
    
    # Process each image in the input folder
    processed_count = 0
    for image_file in input_path.iterdir():
        if image_file.suffix.lower() in image_extensions:
            print(f"Processing: {image_file.name}")
            
            # Create output filename
            output_filename = output_path / f"{image_file.stem}{pipeline.get_output_suffix()}{pipeline.get_output_extension()}"
            
            try:
                pipeline.process_image(image_file, output_filename)
                print(f"  → Saved: {output_filename}")
                processed_count += 1
            except Exception as e:
                print(f"  → Error processing {image_file.name}: {e}")
    
    print(f"\nProcessed {processed_count} images successfully!")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Image processing pipeline tool",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument("input_folder", help="Input folder containing images")
    parser.add_argument("output_folder", help="Output folder for processed images")
    parser.add_argument("--pipeline", "-p", required=True, help="Pipeline(s) to use (comma-separated for composition, e.g., 'cool_variations,mosaic')")
    parser.add_argument("--list-pipelines", action="store_true", help="List available pipelines")
    
    args = parser.parse_args()
    
    # List pipelines if requested
    if args.list_pipelines:
        print("Available pipelines:")
        for name, description in list_pipelines().items():
            print(f"  {name}: {description}")
        return
    
    # Validate input folder exists
    if not os.path.exists(args.input_folder):
        print(f"Error: Input folder '{args.input_folder}' does not exist")
        sys.exit(1)
    
    if not os.path.isdir(args.input_folder):
        print(f"Error: '{args.input_folder}' is not a directory")
        sys.exit(1)
    
    pipeline_list = [name.strip() for name in args.pipeline.split(',')] if ',' in args.pipeline else [args.pipeline]
    if len(pipeline_list) == 1:
        print(f"Using pipeline: {args.pipeline}")
    else:
        print(f"Using composite pipeline: {' → '.join(pipeline_list)}")
    print(f"Processing images from: {args.input_folder}")
    print(f"Saving results to: {args.output_folder}")
    print("-" * 50)
    
    success = process_images(args.input_folder, args.output_folder, args.pipeline)
    
    if success:
        print("-" * 50)
        print("Image processing complete!")
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()