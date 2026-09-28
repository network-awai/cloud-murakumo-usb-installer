{ pkgs, ... }:
{
  # Base for a NixOS Murakumo node after the OS is installed.
  services.tailscale.enable = true;
  hardware.graphics.enable = true;
  environment.systemPackages = with pkgs; [
    curl
    nodejs_22
    vulkan-tools
  ];
  environment.etc."murakumo/node-readiness.mjs".source = ./node-readiness.mjs;
  environment.etc."murakumo/device-claim.mjs".source = ./device-claim.mjs;
  systemd.services.murakumo-device-claim = {
    description = "Murakumo device claim and signed heartbeat";
    wantedBy = [ "multi-user.target" ];
    wants = [ "network-online.target" ];
    after = [ "network-online.target" ];
    unitConfig.ConditionPathExists = "/var/lib/murakumo/device-identity.json";
    serviceConfig = {
      Type = "simple";
      StateDirectory = "murakumo";
      StateDirectoryMode = "0700";
      ExecStart = "${pkgs.nodejs_22}/bin/node /etc/murakumo/device-claim.mjs serve";
      Restart = "always";
      RestartSec = 10;
      NoNewPrivileges = true;
      ProtectSystem = "strict";
      ProtectHome = true;
    };
  };
  # Hardware, disks, model server, credentials, admission and firewall are
  # supplied by the operator's host configuration.
}
