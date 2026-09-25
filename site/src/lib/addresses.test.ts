import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { explorerTokenUrl, isHexAddress, ponsLaunchpadUrl, truncateAddress } from "./addresses";

describe("addresses", () => {
  it("isHexAddress accepts checksummed-length hex", () => {
    assert.equal(isHexAddress("0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168"), true);
    assert.equal(isHexAddress("0xabc"), false);
    assert.equal(isHexAddress(""), false);
  });

  it("truncateAddress shortens middle", () => {
    const a = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as const;
    assert.equal(truncateAddress(a), "0x5fc536…d168");
  });

  it("explorerTokenUrl points at Blockscout", () => {
    const a = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as const;
    assert.equal(explorerTokenUrl(a), `https://robinhoodchain.blockscout.com/token/${a}`);
  });

  it("ponsLaunchpadUrl points at ponsfamily launchpad", () => {
    const a = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as const;
    assert.equal(ponsLaunchpadUrl(a), `https://www.ponsfamily.com/launchpad/${a}`);
  });
});
