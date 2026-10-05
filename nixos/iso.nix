{ modulesPath, pkgs, ... }:
{
  imports = [ "${modulesPath}/installer/cd-dvd/installation-cd-minimal.nix" ];
  # Keep boot diagnostics from overwriting the disk selection screen.
  boot.consoleLogLevel = 3;
  boot.kernelParams = [ "quiet" "systemd.show_status=false" "rd.systemd.show_status=false" ];
  environment.systemPackages = with pkgs; [ curl git pciutils vim nodejs_22 dialog parted dosfstools e2fsprogs ];
  environment.etc."murakumo/installation-media".text = "Murakumo installer\n";
  environment.etc."murakumo/install-disk.mjs".source = ../scripts/install-disk.mjs;
  environment.etc."murakumo/preflight.sh".source = ../scripts/preflight.sh;
  environment.etc."murakumo/node-base.nix".source = ./node-base.nix;
  environment.etc."murakumo/account-link.mjs".source = ./account-link.mjs;
  environment.etc."murakumo/configuration.example.nix".source = ./configuration.example.nix;
  # Enter the guided installer on boot. Formatting requires explicit disk approval.
  systemd.services."getty@tty1".enable = false;
  systemd.services.murakumo-install = {
    description = "Guided automatic Murakumo disk installation";
    wantedBy = [ "multi-user.target" ];
    wants = [ "network-online.target" ];
    after = [ "network-online.target" "systemd-vconsole-setup.service" ];
    conflicts = [ "getty@tty1.service" ];
    path = with pkgs; [ nodejs_22 dialog parted dosfstools e2fsprogs util-linux systemd coreutils nixos-install-tools nix ];
    environment.TERM = "linux";
    environment.NIX_PATH = "nixpkgs=${pkgs.path}";
    serviceConfig = {
      Type = "oneshot";
      ExecStart = "${pkgs.nodejs_22}/bin/node /etc/murakumo/install-disk.mjs";
      StandardInput = "tty-force";
      StandardOutput = "tty";
      StandardError = "tty";
      TTYPath = "/dev/tty1";
      TTYReset = true;
      TimeoutStartSec = "infinity";
      # Never automatically repeat a destructive install after a failure.
      RemainAfterExit = true;
    };
  };
}
