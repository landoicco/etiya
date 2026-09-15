{
  description = "Development environment for Etiya";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    # Add Claude official community input
    nix-claude-code.url = "github:ryoppippi/nix-claude-code";
  };

  outputs = { self, nixpkgs, flake-utils, nix-claude-code }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        # Allow Claude unfree license
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfreePredicate = pkg: nixpkgs.lib.getName pkg == "claude-code";
        };
      in
      {
        devShells.default = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [
            jdk21
            maven
            docker
            docker-compose
            bruno-cli
            # Add Claude
            nix-claude-code.packages.${system}.default
          ];

          shellHook = ''
            export JAVA_HOME="${pkgs.jdk21.home}"
            
            echo "========================================================="
            echo "☕ Java:  $(java -version 2>&1 | head -n 1)"
            echo "🛠️ Maven: $(mvn -v | head -n 1 | cut -d' ' -f1-3)"
            echo "🐳 Docker: $(docker --version)"
            echo "🐶 Bruno CLI: $(bru --version 2>/dev/null || echo "unknown")"
            echo "🤖 Claude CLI: Ready $(claude --version)"
            echo "========================================================="
          '';
        };
      }
    );
}
