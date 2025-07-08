from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, Any

from monadage.monad_image import MonadImage


class Pipeline(ABC):
    """Base class for image processing pipelines"""
    
    def __init__(self, **kwargs):
        self.config = kwargs
    
    @abstractmethod
    def process_image(self, input_path: Path, output_path: Path) -> None:
        """Process a single image from input_path and save to output_path"""
        pass
    
    @abstractmethod
    def get_name(self) -> str:
        """Return the name of this pipeline"""
        pass
    
    @abstractmethod
    def get_description(self) -> str:
        """Return a description of what this pipeline does"""
        pass
    
    def get_output_extension(self) -> str:
        """Return the file extension for output files (default: .png)"""
        return ".png"
    
    def get_output_suffix(self) -> str:
        """Return the suffix to add to output filenames"""
        return f"_{self.get_name()}"