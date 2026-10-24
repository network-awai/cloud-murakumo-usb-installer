{ pkgs, ... }:
let
  # An explicit source set avoids embedding a checkout's .git, local files or
  # credentials. Preserve relative imports for a later reviewed host config.
  files = [
    "AGENTS.md" "LICENSE" "ci/nixpkgs.nix"
    "desktop/index.html" "desktop/desktop.css" "desktop/desktop.js"
    "native/entry-input.kotoba" "native/kaikei-entry.kotoba" "native/dandori-entry.kotoba"
    "nixos/murakumo-nixos.nix" "nixos/native-workspace.nix"
    "nixos/native-package.nix" "nixos/native-sources.json"
    "nixos/network-update.nix" "nixos/network-update.sh" "nixos/network-update-build.nix"
    "scripts/murakumo-network-update"
    "docs/native-network-updates.md" "docs/murakumo-nixos-native-preview.md"
    "docs/evidence/native-network-update-20261024.json"
    "nixos/tests/network-update.nix" "nixos/tests/native-workspace.nix"
    "tests/network-update-eval.nix" "tests/native-profile-eval.nix"
  ];
  source = file: ../. + "/${file}";
  manifest = pkgs.writeText "murakumo-native-media-manifest.json" (builtins.toJSON {
    schema = "murakumo.native-media.v1";
    networkUpdateBaseRevision = "2039e4522a9011bbc9317ea3ad42e72c1e898270";
    nixpkgsRevision = "f5c082a40f7571c266e74e80ae2e68aadd8a9fc7";
    liveNetworkUpdates = false;
    automaticDiskInstallation = false;
    files = pkgs.lib.genAttrs files (file: builtins.hashFile "sha256" (source file));
  });
  profile = pkgs.runCommand "murakumo-native-media-profile" {} ''
    mkdir -p "$out"
    ${pkgs.lib.concatMapStringsSep "\n" (file: "install -D -m 0444 ${source file} \"$out/${file}\"") files}
    cp ${manifest} "$out/media-manifest.json"
  '';
  client = pkgs.writeShellApplication {
    name = "murakumo-network-update";
    inheritPath = false;
    runtimeInputs = [ pkgs.nix pkgs.openssh pkgs.jq pkgs.coreutils ];
    text = builtins.readFile ../scripts/murakumo-network-update;
  };
  helper = import ./network-update-build.nix { nixpkgsPath = pkgs.path; };
in {
  environment.etc."murakumo/native-profile".source = profile;
  environment.etc."murakumo/network-update-guide.md".source = ../docs/native-network-updates.md;
  environment.systemPackages = [ client helper pkgs.jq ];
  system.build.murakumoNativeMedia = profile;
  system.build.murakumoNetworkUpdateClient = client;
}
