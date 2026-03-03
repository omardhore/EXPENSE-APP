import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load local environment variables
dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const server = new Server(
  {
    name: "expense-app-supabase-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_tables",
        description: "List common tables in the Expense App Supabase project",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "query_expenses",
        description: "Query expenses from the Supabase database. Note: May require user context or RLS bypass.",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Number of records to return", default: 10 },
          },
        },
      },
      {
        name: "query_categories",
        description: "Fetch all categories.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      }
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "list_tables": {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(["users", "categories", "expenses", "budgets", "monthly_summaries"], null, 2),
          },
        ],
      };
    }

    case "query_expenses": {
      const limit = Number(request.params.arguments?.limit) || 10;
      const { data, error } = await supabase.from("expenses").select("*").limit(limit);
      
      if (error) {
        throw new McpError(ErrorCode.InternalError, error.message);
      }
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    case "query_categories": {
      const { data, error } = await supabase.from("categories").select("*");
      
      if (error) {
        throw new McpError(ErrorCode.InternalError, error.message);
      }
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    default:
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${request.params.name}`
      );
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Expense App Supabase MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
