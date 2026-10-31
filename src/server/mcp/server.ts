import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "express";
import { z } from "zod";
import { AppError, createTaskSchema } from "../../shared/contracts.js";
import type { TaskService } from "../tasks/service.js";
export function mcpHandler(
  tasks: TaskService,
  providers: () => unknown,
  publicUrl: string,
) {
  return async (req: Request, res: Response) => {
    const owner = res.locals.ownerId as string;
    const server = new McpServer({ name: "mercatum", version: "0.1.0" });
    const result = (value: unknown) => ({
      content: [{ type: "text" as const, text: JSON.stringify(value) }],
    });
    const safe = (fn: () => unknown) => {
      try {
        return result(fn());
      } catch (e) {
        return {
          ...result({
            error: e instanceof AppError ? e.code : "INVALID_INPUT",
            message:
              e instanceof AppError ? e.message : "Invalid tool request.",
          }),
          isError: true,
        };
      }
    };
    const status = (id: string) => {
      const task = tasks.get(owner, id);
      return {
        ...task,
        ...([
          "AWAITING_APPROVAL",
          "PAYMENT_PENDING",
          "PAYMENT_UNKNOWN",
        ].includes(task.state)
          ? {
              status: "pending_user_approval",
              approvalUrl: `${publicUrl}/?task=${encodeURIComponent(id)}`,
            }
          : {}),
      };
    };
    server.registerTool(
      "list_providers",
      {
        description:
          "List the simulated capacity provider backed by the operator model API.",
      },
      () => result(providers()),
    );
    server.registerTool(
      "create_task",
      {
        description:
          "Create bounded work. Human approval and payment happen in the browser. Reuse requestId when retrying.",
        inputSchema: {
          ...createTaskSchema.shape,
          requestId: z.string().min(8).max(100),
        },
      },
      (input) =>
        safe(() => {
          const { requestId, ...command } = input;
          const task = tasks.create(owner, command, requestId);
          return status(task.id);
        }),
    );
    server.registerTool(
      "get_task",
      {
        description: "Read owned task status and its browser approval link.",
        inputSchema: { taskId: z.string() },
      },
      ({ taskId }) => safe(() => status(taskId)),
    );
    server.registerTool(
      "get_result",
      {
        description:
          "Read an owned task result and download links after verified payment.",
        inputSchema: { taskId: z.string() },
      },
      ({ taskId }) =>
        safe(() => {
          const task = tasks.get(owner, taskId);
          return {
            taskId,
            state: task.state,
            result: task.result
              ? {
                  ...task.result,
                  artifacts: task.result.artifacts.map((a) => ({
                    ...tasks.artifact(owner, taskId, a.id),
                    downloadUrl: `${publicUrl}/api/tasks/${encodeURIComponent(taskId)}/artifacts/${encodeURIComponent(a.id)}`,
                  })),
                }
              : undefined,
            receipt: task.receipt,
          };
        }),
    );
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  };
}
