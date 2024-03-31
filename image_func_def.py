from abc import ABC, abstractmethod
from typing import Type

from monadage.image_variants import ImageVariant


class MFunc(ABC):
    
    @abstractmethod
    def get_mode(self) -> Type[ImageVariant]:
        pass
    
    @abstractmethod
    def __call__(self, image: any) -> ImageVariant:
        pass
