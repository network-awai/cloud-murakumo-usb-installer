{ modulesPath, pkgs, ... }:
{
  imports = [ "${modulesPath}/installer/cd-dvd/installation-cd-minimal.nix" ];
  environment.systemPackages = with pkgs; [ curl git nodejs_22 pciutils vim ];
  environment.etc."murakumo/preflight.sh".source = ../scripts/preflight.sh;
  environment.etc."murakumo/node-base.nix".source = ./node-base.nix;
  environment.etc."murakumo/node-readiness.mjs".source = ./node-readiness.mjs;
  environment.etc."murakumo/configuration.example.nix".source = ./configuration.example.nix;
  # This image boots an installation environment. It does not select a disk,
  # partition, format, or invoke nixos-install automatically.
}
