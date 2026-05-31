/**
 * Action Type Definition
 * For MCP (Model Context Protocol) integration
 */

export interface Action {
  name: string;
  similes: string[];
  description: string;
  examples: Array; output: Record; explanation: string }>>;
  schema: any;
  handler: (agent: any, input: Record) => Promise;
}

export interface ActionResult {
  status: "success" | "error";
  message?: string;
  data?: any;
}
