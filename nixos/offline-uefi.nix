{ ... }: {
  imports = [ ./offline-base.nix ];
  fileSystems."/boot" = { device = "/dev/murakumo-boot"; fsType = "vfat"; };
  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = false;
}
