{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    python3
    python3Packages.pip
    python3Packages.pillow
    python3Packages.numpy
    python3Packages.cairosvg
    python3Packages.typing-extensions
    python3Packages.flask
    python3Packages.flask-cors
    
    # System dependencies for image processing
    cairo
    pango
    pkg-config
    
    # Optional: for debugging and development
    python3Packages.ipython
  ];

  shellHook = ''
    echo "🎨 Monadage - Image Processing Pipeline Environment"
    echo "Available packages:"
    echo "  - PIL (Pillow)"
    echo "  - numpy"
    echo "  - cairosvg"
    echo "  - typing-extensions"
    echo "  - flask"
    echo "  - flask-cors"
    echo ""
    echo "CLI Usage:"
    echo "  python main.py <input_folder> <output_folder> --pipeline <pipeline_name>"
    echo "  python main.py --list-pipelines"
    echo ""
    echo "Web Interface:"
    echo "  cd web && python server.py"
    echo "  Then open: http://localhost:5000"
    echo ""
  '';
}