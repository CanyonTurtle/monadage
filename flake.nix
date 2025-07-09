{
  description = "Monadage - Creative Image Processing Pipeline";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Python and core dependencies
            python3
            python3Packages.pip
            python3Packages.pillow
            python3Packages.numpy
            python3Packages.cairosvg
            python3Packages.typing-extensions
            python3Packages.flask
            python3Packages.flask-cors
            
            # Production WSGI server
            python3Packages.gunicorn
            
            # Web server and SSL
            nginx
            certbot
            openssl
            
            # System dependencies for image processing
            cairo
            pango
            pkg-config
            
            # Development tools
            python3Packages.ipython
            git
            curl
            
            # Process management
            psmisc  # for killall
          ];

          shellHook = ''
            echo "🎨 Monadage - Image Processing Pipeline Environment"
            echo "Available packages:"
            echo "  - PIL (Pillow), numpy, cairosvg, flask, flask-cors"
            echo "  - gunicorn (WSGI server)"
            echo "  - nginx, certbot (SSL certificates)"
            echo ""
            echo "Development Usage:"
            echo "  gunicorn -w 1 -b 127.0.0.1:5000 --reload wsgi:app  # Recommended"
            echo "  python main.py --web  # Legacy development server"
            echo "  python main.py <input_folder> <output_folder> --pipeline <pipeline_name>"
            echo "  python main.py --list-pipelines"
            echo ""
            echo "Production Deployment:"
            echo "  ./deploy.sh"
            echo ""
            echo "Manual Production Commands:"
            echo "  gunicorn -w 4 -b 127.0.0.1:5000 wsgi:app"
            echo "  nginx -c $(pwd)/nginx.conf -p $(pwd)"
            echo ""
          '';
        };
      });
}