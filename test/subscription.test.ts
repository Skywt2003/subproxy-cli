import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { parseSubscriptionContent } from "../src/subscription.js";

describe("subscription", () => {
  it("parses JSON array subscriptions", () => {
    const content = JSON.stringify([{ type: "vmess", server: "s1" }]);
    const nodes = parseSubscriptionContent(content, "https://example.com/sub");
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.source).toBe("subscription");
    expect(nodes[0]?.outbound).toMatchObject({ type: "vmess", server: "s1" });
  });

  it("parses JSON object outbounds", () => {
    const content = JSON.stringify({
      outbounds: [{ type: "shadowsocks", server: "s2" }],
    });
    const nodes = parseSubscriptionContent(content, "https://example.com/sub");
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.outbound).toMatchObject({ type: "shadowsocks", server: "s2" });
  });

  it("parses base64 share links", () => {
    const vmessPayload = Buffer.from(
      JSON.stringify({
        v: "2",
        ps: "vmess-node",
        add: "vmess.example.com",
        port: 443,
        id: "00000000-0000-0000-0000-000000000000",
        aid: 0,
        net: "ws",
        host: "example.com",
        path: "/ws",
        tls: "tls",
        scy: "auto",
      }),
      "utf8",
    ).toString("base64");

    const lines = [
      "ss://chacha20-ietf-poly1305:pass@ss.example.com:8388#SS-Node",
      "trojan://secret@trojan.example.com:443?sni=example.com#Trojan-Node",
      "vless://00000000-0000-0000-0000-000000000001@vless.example.com:443?security=tls&type=ws&host=example.com&path=%2Fws#Vless-Node",
      `vmess://${vmessPayload}`,
    ];

    const content = Buffer.from(lines.join("\n"), "utf8").toString("base64");
    const nodes = parseSubscriptionContent(content, "https://example.com/sub");
    expect(nodes).toHaveLength(4);
    expect(nodes.map((node) => node.name)).toEqual([
      "SS-Node",
      "Trojan-Node",
      "Vless-Node",
      "vmess-node",
    ]);
  });
});
