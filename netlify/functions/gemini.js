// netlify/functions/gemini.js

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

exports.handler = async (event, context) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: "",
    };
  }

  // 허용 메서드 체크
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Only POST is allowed" }),
    };
  }

  try {
    const body = event.body || "{}";
    const { prompt } = JSON.parse(body);

    if (!prompt) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "prompt is required" }),
      };
    }

    // ✅ Netlify 환경변수 이름 확인!
    // Netlify에서 Name을 GEMINI_API_KEY 로 설정했으면 이렇게:
    const apiKey = process.env.GEMINI_API_KEY;
    // 만약 네가 GEMINIKEY 라고 해놨으면 윗줄 대신 아래 줄!
    // const apiKey = process.env.GEMINIKEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "API key is not set on server (check GEMINI_API_KEY)",
        }),
      };
    }

    // Gemini API 호출
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
      apiKey;

    const fetchResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    const apiRawText = await fetchResponse.text(); // 먼저 텍스트로 받기

    let apiJson;
    try {
      apiJson = JSON.parse(apiRawText);
    } catch (e) {
      // Gemini가 JSON이 아닌 걸 돌려줬거나, 에러 HTML 등이 온 경우
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "Failed to parse Gemini response as JSON",
          raw: apiRawText,
          status: fetchResponse.status,
        }),
      };
    }

    const text =
      apiJson?.candidates?.[0]?.content?.parts?.[0]?.text ||
      JSON.stringify(apiJson);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ text }),
    };
  } catch (err) {
    console.error("Gemini Function Error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        error: err.message || "Unknown error in function",
      }),
    };
  }
};
