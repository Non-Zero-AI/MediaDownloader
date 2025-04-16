{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.nodePackages.typescript-language-server
    pkgs.yarn
    pkgs.replitPackages.jest
    pkgs.ffmpeg
    pkgs.python3
    pkgs.python3Packages.pip
  ];
}
