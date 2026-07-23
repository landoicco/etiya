{
  description = "Development environment for Etiya";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      # Define your target system architecture
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        # nativeBuildInputs is the recommended practice for development tools and CLIs
        nativeBuildInputs = [
          pkgs.jdk21
          pkgs.maven
        ];

        # Environment variables and welcome scripts
        shellHook = ''
          # Set JAVA_HOME pointing directly to the isolated Nix JDK path
          export JAVA_HOME="${pkgs.jdk21.home}"

          # Print current versions for verification
          echo "========================================================="
          echo "☕ Java:  $(java -version 2>&1 | head -n 1)"
          echo "🛠️ Maven: $(mvn -v | head -n 1 | cut -d' ' -f1-3)"
          echo "========================================================="
        '';
      };
    };
}
