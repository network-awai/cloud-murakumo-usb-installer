{ ... }: {
  imports = [ ./node-base.nix ];
  networking.hostName = "murakumo-node";
  networking.networkmanager.enable = true;
  services.murakumoAccountLink.enable = true;
  # Prebuilt generic x86_64 storage support; no host-side build is needed.
  boot.initrd.availableKernelModules = [
    "xhci_pci" "ahci" "nvme" "usb_storage" "usbhid" "sd_mod"
    "virtio_pci" "virtio_blk" "virtio_scsi" "sr_mod"
  ];
  hardware.enableRedistributableFirmware = true;
  hardware.cpu.intel.updateMicrocode = true;
  hardware.cpu.amd.updateMicrocode = true;
  fileSystems."/" = { device = "/dev/disk/by-label/MURAKUMO_ROOT"; fsType = "ext4"; };
  users.users.root.hashedPassword = "!";
  services.getty.autologinUser = "root";
  services.openssh.enable = false;
  system.stateVersion = "26.05";
}
