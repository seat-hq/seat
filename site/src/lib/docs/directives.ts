/**
 * Remark plugin: maps container/leaf directives (remark-directive) onto
 * HTML elements that the docs Markdown renderer maps to React components.
 *
 * Supported syntax in documentation pages:
 *
 *   :::callout{type="warning" title="Optional title"}
 *   Markdown **children** work inside callouts.
 *   :::
 *
 *   ::status{value="planned"}
 *
 *   :::tabs
 *   :::tab{label="pnpm"}
 *   ```bash
 *   pnpm install
 *   ```
 *   :::
 *   :::tab{label="make"}
 *   ```bash
 *   make install
 *   ```
 *   :::
 *   :::
 */
import { visit } from "unist-util-visit";
import type { Node, Parent } from "unist";

interface DirectiveNode extends Node {
  name: string;
  attributes?: Record<string, string>;
  children?: Node[];
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
}

const CALLOUT_TYPES = new Set([
  "note",
  "tip",
  "warning",
  "danger",
  "info",
  "implemented",
  "planned",
  "experimental",
  "stub",
]);

export function remarkDocsDirectives() {
  return (tree: Node) => {
    visit(tree, (node: Node) => {
      if (
        node.type !== "containerDirective" &&
        node.type !== "leafDirective" &&
        node.type !== "textDirective"
      ) {
        return;
      }
      const directive = node as DirectiveNode;
      const name = directive.name;
      const attrs = directive.attributes ?? {};
      directive.data ??= {};

      if (name === "callout" && node.type === "containerDirective") {
        const type = CALLOUT_TYPES.has(attrs.type ?? "") ? attrs.type! : "note";
        directive.data.hName = "div";
        directive.data.hProperties = {
          className: ["docs-callout", `docs-callout-${type}`],
          "data-callout": type,
          ...(attrs.title ? { "data-title": attrs.title } : {}),
        };
        return;
      }

      if (name === "status") {
        const value = attrs.value ?? "planned";
        directive.data.hName = "span";
        directive.data.hProperties = {
          className: ["docs-status", `docs-status-${value}`],
          "data-status": value,
        };
        // Status badges render their own label; drop any children.
        (directive as Parent).children = [];
        return;
      }

      if (name === "tabs" && node.type === "containerDirective") {
        directive.data.hName = "div";
        directive.data.hProperties = { className: ["docs-tabs"], "data-tabs": "true" };
        return;
      }

      if (name === "tab" && node.type === "containerDirective") {
        directive.data.hName = "div";
        directive.data.hProperties = {
          className: ["docs-tab"],
          "data-tab": attrs.label ?? "Tab",
        };
        return;
      }

      // Unknown directives degrade to a plain div so content is never lost.
      directive.data.hName = "div";
      directive.data.hProperties = { className: ["docs-directive-unknown"] };
    });
  };
}
