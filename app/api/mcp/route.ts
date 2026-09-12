import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MCP_TOOLS, runMcpTool } from "@/lib/mcpTools";

export const maxDuration = 30;

const SERVER_INFO = { name: "matrimony-lead-tracker", version: "1.0.0" };

// Newest first. The 2026-07-28 revision moved version negotiation out of the
// `initialize` handshake into per-request metadata, so this server speaks both
// eras: modern clients get `server/discover`, older ones get `initialize`.
const SUPPORTED_VERSIONS = ["2026-07-28", "2025-11-25", "2025-06-18", "2025-03-26"];
const MODERN_VERSION = "2026-07-28";

const INSTRUCTIONS =
  "Tools for a family's private marriage-prospect tracker. Profiles are people being " +
  "considered as matches. Ages are always derived from date of birth, so they are current. " +
  "Nakshatra compatibility is scored out of 36; 18 or above counts as compatible. Always " +
  "show the profile url when mentioning someone so it can be opened in the tracker. Never " +
  "invent field values — only record what the user actually tells you.";

const JSONRPC_METHOD_NOT_FOUND = -32601;
const JSONRPC_INVALID_PARAMS = -32602;
const MCP_HEADER_MISMATCH = -32020;
const MCP_UNSUPPORTED_VERSION = -32022;

type JsonRpcId = string | number | null;

function result(id: JsonRpcId, value: unknown, status = 200) {
  return NextResponse.json({ jsonrpc: "2.0", id, result: value }, { status });
}

function failure(id: JsonRpcId, code: number, message: string, data?: unknown, status = 200) {
  return NextResponse.json(
    { jsonrpc: "2.0", id, error: data === undefined ? { code, message } : { code, message, data } },
    { status }
  );
}

function authorized(request: NextRequest): boolean {
  const expected = process.env.MCP_AUTH_TOKEN;
  // Fail closed: with no token configured the endpoint stays shut rather than
  // exposing the family's data to anyone who finds the URL.
  if (!expected) return false;

  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ") && header.slice(7).trim() === expected) return true;

  // Some connector UIs only accept a bare URL with no credential fields, so a
  // token in the query string is supported as a fallback.
  return request.nextUrl.searchParams.get("token") === expected;
}

function baseUrlFor(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) return `${forwardedProto ?? "https"}://${forwardedHost}`;
  return request.nextUrl.origin;
}

function decodeHeaderValue(raw: string): string {
  // Values that can't travel as plain ASCII arrive base64-wrapped in a sentinel.
  const match = raw.match(/^=\?base64\?(.*)\?=$/);
  if (!match) return raw;
  try {
    return Buffer.from(match[1], "base64").toString("utf8");
  } catch {
    return raw;
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return failure(null, JSONRPC_INVALID_PARAMS, "Request body must be valid JSON", undefined, 400);
  }

  const id = (body.id ?? null) as JsonRpcId;
  const method = typeof body.method === "string" ? body.method : "";
  const params = (body.params ?? {}) as Record<string, unknown>;
  const meta = (params._meta ?? {}) as Record<string, unknown>;

  // A JSON-RPC notification has no id and expects no response body.
  const isNotification = body.id === undefined || body.id === null;

  const declaredVersion =
    (typeof meta["io.modelcontextprotocol/protocolVersion"] === "string"
      ? (meta["io.modelcontextprotocol/protocolVersion"] as string)
      : undefined) ?? request.headers.get("mcp-protocol-version") ?? undefined;

  // Modern clients declare their version on every request; legacy ones open
  // with `initialize` instead. Error status codes differ between the two.
  const isModern = declaredVersion === MODERN_VERSION || method === "server/discover";
  const errorStatus = (modernStatus: number) => (isModern ? modernStatus : 200);

  if (declaredVersion && !SUPPORTED_VERSIONS.includes(declaredVersion)) {
    return failure(
      id,
      MCP_UNSUPPORTED_VERSION,
      "Unsupported protocol version",
      { supported: SUPPORTED_VERSIONS, requested: declaredVersion },
      400
    );
  }

  // Header/body mirroring is validated only when the client actually sent the
  // headers, so a client that omits them still works.
  const headerMethod = request.headers.get("mcp-method");
  if (headerMethod && headerMethod !== method) {
    return failure(
      id,
      MCP_HEADER_MISMATCH,
      `Mcp-Method header '${headerMethod}' does not match body method '${method}'`,
      undefined,
      400
    );
  }

  switch (method) {
    // --- modern era -------------------------------------------------------
    case "server/discover":
      return result(id, {
        resultType: "complete",
        supportedVersions: SUPPORTED_VERSIONS,
        capabilities: { tools: {} },
        instructions: INSTRUCTIONS,
        _meta: { "io.modelcontextprotocol/serverInfo": SERVER_INFO },
      });

    // --- legacy era -------------------------------------------------------
    case "initialize": {
      const requested =
        typeof params.protocolVersion === "string" ? params.protocolVersion : undefined;
      return result(id, {
        protocolVersion:
          requested && SUPPORTED_VERSIONS.includes(requested) ? requested : "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }

    // --- both -------------------------------------------------------------
    case "tools/list":
      return result(id, { tools: MCP_TOOLS });

    case "tools/call": {
      const name = typeof params.name === "string" ? params.name : "";
      const args = (params.arguments ?? {}) as Record<string, unknown>;

      const headerName = request.headers.get("mcp-name");
      if (headerName && decodeHeaderValue(headerName) !== name) {
        return failure(
          id,
          MCP_HEADER_MISMATCH,
          `Mcp-Name header does not match body tool name '${name}'`,
          undefined,
          400
        );
      }

      try {
        const value = await runMcpTool(name, args, baseUrlFor(request));
        return result(id, {
          content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Tool call failed";
        console.error(`MCP tool '${name}' failed:`, err);
        // Tool failures are reported in-band so the model can read and react
        // to them, rather than as a protocol-level error.
        return result(id, {
          content: [{ type: "text", text: `Error: ${message}` }],
          isError: true,
        });
      }
    }

    case "ping":
      return result(id, {});

    default:
      if (isNotification) return new NextResponse(null, { status: 202 });
      return failure(
        id,
        JSONRPC_METHOD_NOT_FOUND,
        `Method not found: ${method}`,
        undefined,
        errorStatus(404)
      );
  }
}

// The current revision dropped the standalone GET stream and protocol-level
// sessions; both are answered with 405 as the spec prescribes.
export async function GET() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}

export async function DELETE() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, authorization, mcp-protocol-version, mcp-method, mcp-name",
    },
  });
}
