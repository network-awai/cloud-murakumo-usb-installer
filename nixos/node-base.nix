{ pkgs, lib, config, ... }:
{
  options.services.murakumoAccountLink.enable = lib.mkEnableOption "passwordless first-boot Murakumo registration";
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
    wants = [ "network.target" ];
    after = [ "network.target" ];
    conflicts = [ "getty@tty1.service" ];
    path = [ pkgs.qrencode ];
    serviceConfig = {
      Type = "simple";
      RemainAfterExit = true;
      ExecStart = pkgs.writeShellScript "murakumo-account-registration" ''
        echo "Murakumo OS is installed. Waiting for network for account registration."
        echo "Local maintenance: Ctrl+Alt+F2. OS installation does not need Internet."
        until ${pkgs.iproute2}/bin/ip -4 route show default | ${pkgs.gnugrep}/bin/grep -q '^default' ||
              ${pkgs.iproute2}/bin/ip -6 route show default | ${pkgs.gnugrep}/bin/grep -q '^default'; do
          ${pkgs.coreutils}/bin/sleep 5
        done
        exec ${pkgs.nodejs_22}/bin/node /etc/murakumo/account-link.mjs
      '';
      StateDirectory = "murakumo";
      StateDirectoryMode = "0700";
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
