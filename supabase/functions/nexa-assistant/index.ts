import { createClient } from "npm:@supabase/supabase-js@2.117.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SECRET_KEYS = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const SUPABASE_SECRET_KEY =
  SUPABASE_SECRET_KEYS.default ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

const functionDeclarations = [
  {
    name: "create_task",
    description: "Create a task for the authenticated user.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        due_at: { type: "string", description: "ISO-8601 datetime or omit for no due date" },
        priority: {
          type: "string",
          enum: ["low", "normal", "high", "urgent"],
        },
      },
      required: ["title"],
    },
  },
  {
    name: "list_tasks",
    description: "List the authenticated user's tasks. Use this when the user asks what tasks they have, what is pending, or asks about today's tasks.",
    parameters: {
      type: "object",
      properties: {
        include_completed: { type: "boolean" },
      },
      required: [],
    },
  },
  {
    name: "complete_task",
    description: "Mark one of the authenticated user's tasks as completed.",
    parameters: {
      type: "object",
      properties: {
        task_id: { type: "string" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "create_reminder",
    description: "Create a reminder for the authenticated user.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        remind_at: { type: "string", description: "ISO-8601 datetime" },
      },
      required: ["title", "remind_at"],
    },
  },
  {
    name: "list_reminders",
    description: "List the authenticated user's reminders. Use this when the user asks what reminders they have or what reminders are upcoming.",
    parameters: {
      type: "object",
      properties: {
        include_completed: { type: "boolean" },
      },
      required: [],
    },
  },
  {
    name: "complete_reminder",
    description: "Mark one of the authenticated user's reminders as completed.",
    parameters: {
      type: "object",
      properties: {
        reminder_id: { type: "string" },
      },
      required: ["reminder_id"],
    },
  },
  {
    name: "create_event",
    description: "Create a calendar event for the authenticated user.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        starts_at: { type: "string", description: "ISO-8601 datetime" },
        ends_at: { type: "string", description: "ISO-8601 datetime" },
        location: { type: "string" },
      },
      required: ["title", "starts_at", "ends_at"],
    },
  },
  {
    name: "list_events",
    description: "List upcoming calendar events for the authenticated user.",
    parameters: {
      type: "object",
      properties: {
        from: { type: "string" },
        to: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "create_note",
    description: "Create a note for the authenticated user.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string" },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "list_notes",
    description: "List recent notes for the authenticated user.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number" },
      },
      required: [],
    },
  },
  {
    name: "create_goal",
    description: "Create a goal for the authenticated user.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        target_date: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["title"],
    },
  },
  {
    name: "list_goals",
    description: "List goals for the authenticated user.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

const geminiTools = [{ functionDeclarations }];

async function callGemini(contents: any[], systemInstruction: string) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents,
          tools: geminiTools,
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 1200,
          },
        }),
        signal: controller.signal,
      },
    );

    const raw = await response.text();

    if (!response.ok) {
      throw new Error(`Gemini ${response.status}: ${raw.slice(0, 1000)}`);
    }

    return JSON.parse(raw);
  } finally {
    clearTimeout(timeout);
  }
}

async function runTool(name: string, args: any, userId: string) {
  if (name === "create_task") {
    const { data, error } = await admin
      .from("tasks")
      .insert({
        user_id: userId,
        title: String(args.title || "").slice(0, 300),
        due_at: args.due_at || null,
        priority: args.priority || "normal",
      })
      .select("id,title,due_at,priority,completed_at")
      .single();
    return error ? { error: error.message } : data;
  }

  if (name === "list_tasks") {
    let query = admin
      .from("tasks")
      .select("id,title,due_at,completed_at,priority")
      .eq("user_id", userId)
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(50);

    if (!args.include_completed) query = query.is("completed_at", null);
    const { data, error } = await query;
    return error ? { error: error.message } : data || [];
  }

  if (name === "complete_task") {
    const { data, error } = await admin
      .from("tasks")
      .update({
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.task_id)
      .eq("user_id", userId)
      .select("id,title,completed_at")
      .maybeSingle();
    return error
      ? { error: error.message }
      : data || { error: "Task not found" };
  }

  if (name === "create_reminder") {
    const { data, error } = await admin
      .from("reminders")
      .insert({
        user_id: userId,
        title: String(args.title || "").slice(0, 300),
        remind_at: args.remind_at,
      })
      .select("id,title,remind_at,completed_at")
      .single();
    return error ? { error: error.message } : data;
  }

  if (name === "list_reminders") {
    let query = admin
      .from("reminders")
      .select("id,title,remind_at,completed_at,notified_at")
      .eq("user_id", userId)
      .order("remind_at", { ascending: true })
      .limit(50);

    if (!args.include_completed) query = query.is("completed_at", null);
    const { data, error } = await query;
    return error ? { error: error.message } : data || [];
  }

  if (name === "complete_reminder") {
    const { data, error } = await admin
      .from("reminders")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", args.reminder_id)
      .eq("user_id", userId)
      .select("id,title,remind_at,completed_at")
      .maybeSingle();
    return error
      ? { error: error.message }
      : data || { error: "Reminder not found" };
  }

  if (name === "create_event") {
    const { data, error } = await admin
      .from("calendar_events")
      .insert({
        user_id: userId,
        title: String(args.title || "").slice(0, 300),
        starts_at: args.starts_at,
        ends_at: args.ends_at,
        location: args.location || null,
      })
      .select("id,title,starts_at,ends_at,location")
      .single();
    return error ? { error: error.message } : data;
  }

  if (name === "list_events") {
    let query = admin
      .from("calendar_events")
      .select("id,title,starts_at,ends_at,location")
      .eq("user_id", userId)
      .order("starts_at", { ascending: true })
      .limit(50);

    if (args.from) query = query.gte("starts_at", args.from);
    if (args.to) query = query.lte("starts_at", args.to);

    const { data, error } = await query;
    return error ? { error: error.message } : data || [];
  }

  if (name === "create_note") {
    const { data, error } = await admin
      .from("notes")
      .insert({
        user_id: userId,
        title: String(args.title || "").slice(0, 200),
        content: String(args.content || "").slice(0, 20000),
      })
      .select("id,title,content")
      .single();
    return error ? { error: error.message } : data;
  }

  if (name === "list_notes") {
    const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 30);
    const { data, error } = await admin
      .from("notes")
      .select("id,title,content,updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(limit);
    return error ? { error: error.message } : data || [];
  }

  if (name === "create_goal") {
    const { data, error } = await admin
      .from("goals")
      .insert({
        user_id: userId,
        title: String(args.title || "").slice(0, 200),
        description: args.description
          ? String(args.description).slice(0, 5000)
          : null,
        target_date: args.target_date || null,
      })
      .select("id,title,description,target_date,completed_at")
      .single();
    return error ? { error: error.message } : data;
  }

  if (name === "list_goals") {
    const { data, error } = await admin
      .from("goals")
      .select("id,title,description,target_date,completed_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    return error ? { error: error.message } : data || [];
  }

  return { error: `Unknown tool: ${name}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  try {
    if (!GEMINI_API_KEY) {
      return json({ error: "AI service is not configured." }, 503);
    }

    if (!SUPABASE_SECRET_KEY) {
      return json({ error: "Supabase server configuration is missing." }, 503);
    }

    const authorization = req.headers.get("Authorization") || "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!token) {
      return json({ error: "Unauthorized." }, 401);
    }

    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !user) {
      return json({ error: "Unauthorized." }, 401);
    }

    const body = await req.json();
    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (!message || message.length > 8000) {
      return json({ error: "Invalid message." }, 400);
    }

    const { data: quota, error: quotaError } = await admin.rpc(
      "consume_nexa_ai_request",
      { p_user_id: user.id },
    );

    if (quotaError) throw quotaError;

    const quotaRow = Array.isArray(quota) ? quota[0] : quota;

    if (!quotaRow?.allowed) {
      return json(
        {
          error: `Daily AI limit reached for ${quotaRow?.plan || "free"} plan.`,
          daily_limit: quotaRow?.daily_limit ?? 30,
          request_count: quotaRow?.request_count ?? 0,
          plan: quotaRow?.plan || "free",
        },
        429,
      );
    }

    let conversationId =
      typeof body.conversation_id === "string"
        ? body.conversation_id
        : null;

    if (conversationId) {
      const { data } = await admin
        .from("conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data) conversationId = null;
    }

    if (!conversationId) {
      const { data, error } = await admin
        .from("conversations")
        .insert({
          user_id: user.id,
          title: message.slice(0, 60),
        })
        .select("id")
        .single();

      if (error) throw error;
      conversationId = data.id;
    }

    const { error: messageError } = await admin
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: "user",
        content: message,
      });

    if (messageError) throw messageError;

    const { data: history, error: historyError } = await admin
      .from("messages")
      .select("role,content")
      .eq("conversation_id", conversationId)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: true })
      .limit(50);

    if (historyError) throw historyError;

    const { data: profile } = await admin
      .from("profiles")
      .select("display_name,timezone")
      .eq("id", user.id)
      .maybeSingle();

    const now = new Date().toISOString();
    const timezone = profile?.timezone || "Africa/Lagos";
    const userName = profile?.display_name || "there";

    const systemInstruction =
      `You are NEXA, a premium personal assistant. Current UTC time: ${now}. User timezone: ${timezone}. User name: ${userName}.
Use the user's real tasks, reminders, calendar events, notes, and goals when answering questions about them.
When the user asks to add/create/save something, use the appropriate tool.
When the user asks to know/list/show their tasks or reminders, use the appropriate list tool instead of guessing from chat history.
Never claim an action happened unless the tool returned a successful result.
Be concise, clear, and practical.`;

    const contents: any[] = (history || []).map((item: any) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: String(item.content || "") }],
    }));

    let reply = "";
    let inputTokens = 0;
    let outputTokens = 0;

    for (let round = 0; round < 6; round++) {
      const response = await callGemini(contents, systemInstruction);

      inputTokens += Number(response.usageMetadata?.promptTokenCount || 0);
      outputTokens += Number(
        response.usageMetadata?.candidatesTokenCount || 0,
      );

      const candidate = response.candidates?.[0];
      const modelContent = candidate?.content;

      if (!modelContent) {
        throw new Error("Gemini returned no content.");
      }

      const functionCalls = (modelContent.parts || [])
        .map((part: any) => part.functionCall)
        .filter(Boolean);

      if (functionCalls.length === 0) {
        reply =
          (modelContent.parts || [])
            .map((part: any) => (typeof part.text === "string" ? part.text : ""))
            .join("")
            .trim() || "I'm here.";
        break;
      }

      // Send the complete model tool-call turn back unchanged, then return
      // one function response for every function call.
      contents.push(modelContent);

      const responseParts = [];

      for (const functionCall of functionCalls) {
        const args =
          functionCall.args && typeof functionCall.args === "object"
            ? functionCall.args
            : {};

        const result = await runTool(
          String(functionCall.name || ""),
          args,
          user.id,
        );

        const functionResponse: any = {
          name: String(functionCall.name || ""),
          response: { result },
        };

        if (functionCall.id) {
          functionResponse.id = functionCall.id;
        }

        responseParts.push({ functionResponse });
      }

      contents.push({
        role: "user",
        parts: responseParts,
      });
    }

    if (!reply) {
      reply =
        "I completed the requested action. What would you like to do next?";
    }

    const { data: savedMessage, error: saveError } = await admin
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: "assistant",
        content: reply,
      })
      .select("id")
      .single();

    if (saveError) throw saveError;

    await admin
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("user_id", user.id);

    if (inputTokens || outputTokens) {
      await admin.rpc("record_nexa_ai_tokens", {
        p_user_id: user.id,
        p_input_tokens: inputTokens,
        p_output_tokens: outputTokens,
      });
    }

    return json({
      conversation_id: conversationId,
      reply,
      message_id: savedMessage.id,
    });
  } catch (error) {
    console.error("nexa-assistant", error);
    return json({ error: "NEXA could not complete that request." }, 500);
  }
});
