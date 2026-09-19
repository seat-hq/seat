import type { Abi } from "viem";
import deskVaultJson from "./DeskVault.json";
import deskFactoryJson from "./DeskFactory.json";
import ierc20Json from "./IERC20.json";

/** ABIs copied from Foundry `out/` — not hand-written. */
export const deskVaultAbi = deskVaultJson as Abi;
export const deskFactoryAbi = deskFactoryJson as Abi;
export const erc20Abi = ierc20Json as Abi;
