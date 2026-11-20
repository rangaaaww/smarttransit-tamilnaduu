// SmartTransit Tamil Nadu — Serverless Gemini AI Proxy (Cloudflare Worker)
// Keeps GEMINI_API_KEY encrypted in Cloudflare Runtime Secrets (never exposed to client).

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("SmartTransit AI Proxy Active", { status: 200, headers: corsHeaders });
    }

    try {
      const { systemInstruction, contents } = await request.json();
      const models = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];
      let lastError = "No response";

      for (const model of models) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": env.GEMINI_API_KEY
            },
            body: JSON.stringify({ systemInstruction, contents })
          }
        );

        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (res.ok && reply) {
          return new Response(JSON.stringify({ reply }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        lastError = data.error?.message || `HTTP ${res.status}`;
      }

      return new Response(JSON.stringify({ error: lastError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
