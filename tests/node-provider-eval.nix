{ nixpkgsPath }:
let
  evaluate = enabled: import (nixpkgsPath + "/nixos") {
    system = "x86_64-linux";
    configuration = {
      imports = [ ../nixos/node-base.nix ];
      networking.hostName = "murakumo-test";
      services.murakumoProvider = {
        enable = enabled;
        model = "test-model";
      };
    };
  };
  disabled = evaluate false;
  enabled = evaluate true;
  unit = enabled.config.systemd.services.murakumo-provider;
in
assert !builtins.hasAttr "murakumo-provider" disabled.config.systemd.services;
assert unit.serviceConfig.DynamicUser == true;
assert unit.serviceConfig.LoadCredential == [ "device-identity.json:/var/lib/murakumo/device-identity.json" ];
assert unit.unitConfig.ConditionPathExists == "/var/lib/murakumo/device-identity.json";
assert unit.wantedBy == [ "multi-user.target" ];
{
  disabledByDefault = true;
  enabledWithPrivateIdentity = true;
}
