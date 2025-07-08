{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    python3
    python3Packages.pip
    python3Packages.pillow
    python3Packages.numpy
    python3Packages.cairosvg
    python3Packages.typing-extensions
    
    # System dependencies for image processing
    cairo
    pango
    pkg-config
    
    # Optional: for debugging and development
    python3Packages.ipython
  ];

  shellHook = ''
    echo "Python image processing environment loaded!"
    echo "Available packages:"
    echo "  - PIL (Pillow)"
    echo "  - numpy"
    echo "  - cairosvg"
    echo "  - typing-extensions"
    echo ""
    echo "Usage: python main.py <input_folder> <output_folder>"
    echo "Example: python main.py ./input_images ./output_images"
  '';
}