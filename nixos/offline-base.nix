{ lib, ... }: {
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
  fileSystems."/" = { device = "/dev/murakumo-root"; fsType = "ext4"; };
  # Bind this installation to its own filesystem IDs, never shared labels.
  # The offline prebuilt closure is generic; the installer writes IDs to each
  # boot entry and the retained Nix configuration after formatting.
  boot.initrd.systemd.enable = lib.mkForce false;
  boot.initrd.postDeviceCommands = ''
    root_uuid= boot_uuid=
    for arg in $(cat /proc/cmdline); do
      case "$arg" in
        murakumo.root_uuid=*) root_uuid="''${arg#*=}" ;;
        murakumo.boot_uuid=*) boot_uuid="''${arg#*=}" ;;
      esac
    done
    if printf '%s' "$root_uuid" | grep -Eq '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'; then
      ln -s "/dev/disk/by-uuid/$root_uuid" /dev/murakumo-root
    fi
    if printf '%s' "$boot_uuid" | grep -Eq '^[0-9A-F]{4}-[0-9A-F]{4}$'; then
      ln -s "/dev/disk/by-uuid/$boot_uuid" /dev/murakumo-boot
    fi
  '';
  users.users.root.hashedPassword = "!";
  services.getty.autologinUser = "root";
  services.openssh.enable = false;
  system.stateVersion = "26.05";
}
