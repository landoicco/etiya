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

        # Tool groups, combined by the shells below. Adding a tool happens in one place only
        tools = {
          java = with pkgs; [ jdk21 maven ];
          container = with pkgs; [ docker docker-compose ];
          testing = [ pkgs.bruno-cli ];
          # The CDK CLI is a Node.js tool, and CDK Java apps also need Node to synth.
          # graphviz renders the architecture diagram from the synthesized stack
          cloud = with pkgs; [ aws-cdk-cli nodejs awscli2 graphviz ];
          claude = [ nix-claude-code.packages.${system}.default ];
        };

        # What each group reports when entering a shell
        versions = {
          java = ''
            echo "☕ Java:  $(java -version 2>&1 | head -n 1)"
            echo "🛠️ Maven: $(mvn -v | head -n 1 | cut -d' ' -f1-3)"
          '';
          container = ''
            echo "🐳 Docker: $(docker --version)"
          '';
          testing = ''
            echo "🐶 Bruno CLI: $(bru --version 2>/dev/null || echo "unknown")"
          '';
          cloud = ''
            echo "🟩 Node:  $(node --version)"
            echo "☁️ AWS CLI: $(aws --version 2>&1 | cut -d' ' -f1)"
            echo "🏗️ AWS CDK CLI: ${pkgs.aws-cdk-cli.version}"
          '';
          claude = ''
            echo "🤖 Claude CLI: Ready $(claude --version)"
          '';
        };

        mkEtiyaShell = { name, purpose, groups }:
          pkgs.mkShell {
            packages = builtins.concatLists (map (group: tools.${group}) groups);

            shellHook = ''
              ${pkgs.lib.optionalString (builtins.elem "java" groups)
                ''export JAVA_HOME="${pkgs.jdk21.home}"''}

              echo "========================================================="
              echo "🏋️ Etiya · ${name} — ${purpose}"
              ${builtins.concatStringsSep "\n" (map (group: versions.${group}) groups)}
              echo "========================================================="
            '';
          };
      in
      {
        # nix develop          -> default
        # nix develop .#dev    -> pick a specific shell
        devShells = {
          default = mkEtiyaShell {
            name = "default";
            purpose = "every tool";
            groups = [ "java" "container" "testing" "cloud" "claude" ];
          };

          dev = mkEtiyaShell {
            name = "dev";
            purpose = "build, run and test locally";
            groups = [ "java" "container" "testing" "claude" ];
          };

          infra = mkEtiyaShell {
            name = "infra";
            purpose = "synth and deploy with the CDK";
            groups = [ "java" "cloud" ];
          };

          run = mkEtiyaShell {
            name = "run";
            purpose = "just start the app";
            groups = [ "container" ];
          };
        };
      }
    );
}
