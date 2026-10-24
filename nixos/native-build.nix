{ nixpkgsPath ? import ../ci/nixpkgs.nix }:
let
  pkgs = import nixpkgsPath { system = "x86_64-linux"; };
  system = import (nixpkgsPath + "/nixos") {
    system = "x86_64-linux";
    configuration = ./native-iso.nix;
  };
in {
  package = import ./native-package.nix { inherit pkgs; };
  iso = system.config.system.build.isoImage;
  system = system.config.system.build.toplevel;
}
