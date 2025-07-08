from typing import Dict, Type, List, Union
from pathlib import Path
from .base import Pipeline
from .cool_variations import CoolVariationsPipeline
from .four_corners import FourCornersPipeline
from .mosaic import MosaicPipeline
from .dynamic_mosaic import DynamicMosaicPipeline


# Registry of available pipelines
PIPELINES: Dict[str, Type[Pipeline]] = {
    "cool_variations": CoolVariationsPipeline,
    "four_corners": FourCornersPipeline,
    "mosaic": MosaicPipeline,
    "dynamic_mosaic": DynamicMosaicPipeline,
}


class CompositePipeline:
    """A composite pipeline that runs multiple pipelines in sequence"""
    
    def __init__(self, pipelines: List[Pipeline]):
        self.pipelines = pipelines
    
    def get_name(self) -> str:
        names = [p.get_name() for p in self.pipelines]
        return "+".join(names)
    
    def get_description(self) -> str:
        names = [p.get_name() for p in self.pipelines]
        return f"Composite pipeline: {' → '.join(names)}"
    
    def get_output_extension(self) -> str:
        # Use the last pipeline's output extension
        return self.pipelines[-1].get_output_extension()
    
    def get_output_suffix(self) -> str:
        names = [p.get_name() for p in self.pipelines]
        return f"_{'_'.join(names)}"
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        """Process image through all pipelines in sequence"""
        current_input = input_path
        
        # For intermediate steps, create temporary files
        for i, pipeline in enumerate(self.pipelines):
            if i == len(self.pipelines) - 1:
                # Last pipeline outputs to final destination
                current_output = output_path
            else:
                # Intermediate output (create temp file)
                temp_suffix = f"_temp_{i}_{pipeline.get_name()}"
                current_output = output_path.parent / f"{output_path.stem}{temp_suffix}.png"
            
            # Process through this pipeline
            pipeline.process_image(current_input, current_output)
            
            # Next pipeline's input is this pipeline's output
            current_input = current_output


def get_pipeline(names: Union[str, List[str]], **kwargs) -> Union[Pipeline, CompositePipeline]:
    """Get a pipeline instance by name(s) - supports composition"""
    if isinstance(names, str):
        # Single pipeline
        if names not in PIPELINES:
            available = ", ".join(PIPELINES.keys())
            raise ValueError(f"Unknown pipeline '{names}'. Available pipelines: {available}")
        return PIPELINES[names](**kwargs)
    
    elif isinstance(names, list):
        # Multiple pipelines - create composite
        pipelines = []
        for name in names:
            if name not in PIPELINES:
                available = ", ".join(PIPELINES.keys())
                raise ValueError(f"Unknown pipeline '{name}'. Available pipelines: {available}")
            pipelines.append(PIPELINES[name](**kwargs))
        
        return CompositePipeline(pipelines)
    
    else:
        raise ValueError("Pipeline names must be a string or list of strings")


def list_pipelines() -> Dict[str, str]:
    """List all available pipelines with their descriptions"""
    return {
        name: pipeline_class().get_description() 
        for name, pipeline_class in PIPELINES.items()
    }