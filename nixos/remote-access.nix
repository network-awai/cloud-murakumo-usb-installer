{ config, lib, pkgs, ... }:
let cfg=config.services.murakumoRemote;
 runtime=pkgs.runCommand "murakumo-remote-runtime" {} ''
  mkdir -p $out
  cp ${./remote-access.mjs} $out/remote-access.mjs
  cp ${./remote-access.html} $out/remote-access.html
  cp ${./remote-client.js} $out/remote-client.js
  cp ${./remote-ui.mjs} $out/remote-ui.mjs
  cp ${./murakumo-logo.svg} $out/murakumo-logo.svg
  cp ${./node-status.mjs} $out/node-status.mjs
 '';
in {
 options.services.murakumoRemote.enable=lib.mkEnableOption "locally approved LAN management and SSH";
 config=lib.mkIf cfg.enable {
  users.users.murakumo-admin={isNormalUser=true;hashedPassword="!";extraGroups=["wheel"];};
  security.sudo.extraRules=[{users=["murakumo-admin"];commands=[{command="ALL";options=["NOPASSWD"]; }];}];
  services.openssh.enable=true;
  services.openssh.settings={PasswordAuthentication=false;KbdInteractiveAuthentication=false;PermitRootLogin="no";AllowUsers=["murakumo-admin"];};
  services.openssh.authorizedKeysFiles=["/etc/ssh/authorized_keys.d/%u"];
  systemd.services.sshd.unitConfig.ConditionPathExists="/etc/ssh/authorized_keys.d/murakumo-admin";
  systemd.tmpfiles.rules=["d /etc/ssh/authorized_keys.d 0755 root root -"];
  networking.firewall.allowedTCPPorts=[8443];
  environment.etc."murakumo/remote-access.nix".source=./remote-access.nix;
  environment.etc."murakumo/remote-ui.mjs".source="${runtime}/remote-ui.mjs";
  environment.etc."murakumo/remote-access.mjs".source="${runtime}/remote-access.mjs";
  environment.etc."murakumo/remote-access.html".source=./remote-access.html;
  environment.etc."murakumo/remote-client.js".source=./remote-client.js;
  systemd.services.murakumo-remote={
   description="Locally approved Murakumo LAN management";
   wantedBy=["multi-user.target"];after=["network.target"];
   path=with pkgs;[openssl systemd networkmanager coreutils];
   serviceConfig={ExecStart="${pkgs.nodejs_22}/bin/node ${runtime}/remote-access.mjs";
    StateDirectory="murakumo-remote";StateDirectoryMode="0700";
    RuntimeDirectory="murakumo-remote";RuntimeDirectoryMode="0700";
    UMask="0077";NoNewPrivileges=true;ProtectSystem="strict";ProtectHome=true;
    ReadWritePaths=["/etc/ssh/authorized_keys.d"];Restart="on-failure";};
  };
 };
}
