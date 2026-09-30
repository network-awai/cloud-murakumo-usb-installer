{ pkgs, ... }:
{
  imports = [ ./node-provider.nix ./node-claim.nix ];

  # Base for a NixOS Murakumo node after the OS is installed.
  services.tailscale.enable = true;
  hardware.graphics.enable = true;
  environment.systemPackages = with pkgs; [
    curl
    nodejs_22
    vulkan-tools
  ];
  # Hardware, disks, model server, credentials, admission and firewall are
  # supplied by the operator's host configuration.
}
