# replit.nix - helps Replit include nodejs_22 in the environment
{ pkgs }:

{
  deps = [
    pkgs.nodejs_22
  ];
}
