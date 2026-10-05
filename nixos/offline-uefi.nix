{ ... }: {
  imports = [ ./offline-base.nix ];
  fileSystems."/boot" = { device = "/dev/disk/by-label/MURA_BOOT"; fsType = "vfat"; };
  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = false;
}
