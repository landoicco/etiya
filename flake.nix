{
  description = "Development environment for Etiya";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [
            jdk21
            maven
            docker
            docker-compose
          ];

          shellHook = ''
            export JAVA_HOME="${pkgs.jdk21.home}"
            
            echo "========================================================="
            echo "☕ Java:  $(java -version 2>&1 | head -n 1)"
            echo "🛠️ Maven: $(mvn -v | head -n 1 | cut -d' ' -f1-3)"
            echo "🐳 Docker: $(docker --version)"
            echo "========================================================="
          '';
        };
      }
    );
}   

