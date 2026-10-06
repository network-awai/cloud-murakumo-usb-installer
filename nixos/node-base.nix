{ pkgs, lib, config, ... }:
{
  options.services.murakumoAccountLink.enable = lib.mkEnableOption "passwordless first-boot Murakumo registration";
  imports = [ ./console-ui.nix ];
  config = {
  # Base for a NixOS Murakumo node after the OS is installed.
  services.tailscale.enable = true;
  hardware.graphics.enable = true;
  environment.systemPackages = with pkgs; [
    curl
    nodejs_22
    vulkan-tools
    qrencode
  ];
  environment.etc."murakumo/account-link.mjs".source = ./account-link.mjs;
  systemd.services."getty@tty1".enable = lib.mkIf config.services.murakumoAccountLink.enable false;
  systemd.services.murakumo-account-link = lib.mkIf config.services.murakumoAccountLink.enable {
    description = "Register this Murakumo device using a phone Passkey";
    wantedBy = [ "multi-user.target" ];
    wants = [ "network.target" "seatd.service" ];
    after = [ "network.target" "seatd.service" ];
    conflicts = [ "getty@tty1.service" ];
    path = with pkgs; [ qrencode dialog networkmanager iproute2 systemd ];
    environment.HOME = "/var/lib/murakumo";
    serviceConfig = {
      Type = "simple";
      RemainAfterExit = true;
      ExecStart = "${pkgs.bash}/bin/bash /etc/murakumo/launch-ui ${pkgs.nodejs_22}/bin/node /etc/murakumo/setup-ui.mjs";
      StateDirectory = "murakumo";
      StateDirectoryMode = "0700";
      RuntimeDirectory = "murakumo-ui";
      RuntimeDirectoryMode = "0700";
      StandardInput = "tty-force";
      StandardOutput = "tty";
      StandardError = "tty";
      TTYPath = "/dev/tty1";
      TTYReset = true;
      Restart = "on-failure";
      RestartSec = 15;
      NoNewPrivileges = true;
      ProtectSystem = "strict";
      ProtectHome = true;
      TimeoutStartSec = "infinity";
    };
  };
  # Hardware, disks, model server, credentials, admission and firewall are
  # supplied by the operator's host configuration.
  };
}
