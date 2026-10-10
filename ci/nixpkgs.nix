# Same immutable package source used for the shipping installer.
builtins.fetchTarball {
  url = "https://github.com/NixOS/nixpkgs/archive/f5c082a40f7571c266e74e80ae2e68aadd8a9fc7.tar.gz";
  sha256 = "11cw91q3r1nrlh3sc86n1jipgijy3njp3z9s3j0rwi6mi2adc6ki";
}
