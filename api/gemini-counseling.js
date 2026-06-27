export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: "GEMINI_API_KEY 환경 변수가 설정되지 않았습니다." });
  }

  const { studentAlias, gradeSummary, learningTraits, teacherConcern } = req.body;

  if (!studentAlias || !gradeSummary || !learningTraits || !teacherConcern) {
    return res.status(400).json({ success: false, error: "필수 데이터가 누락되었습니다." });
  }

  // Gemini 프롬프트 원칙
  const systemInstruction = `
당신은 교사를 돕는 "AI 학생 상담 전략 도우미"입니다.
다음 원칙을 엄격히 준수하여 응답하세요:
1. 학생을 단정적으로 판단하거나 진단하지 마세요. (예: "의지가 부족하다", "주의력 문제가 있다", "심리적 문제가 있다" 등의 표현 금지)
2. 교사가 학생을 이해하고 대화할 수 있도록 돕는 방향으로 제안하세요.
3. 응답은 반드시 다음 6가지 항목으로 구성하세요:
   1) 현재 상황 요약
   2) 학생 데이터 기반 해석
   3) 상담 접근 전략
   4) 교사가 던질 수 있는 질문 3개
   5) 피해야 할 말 또는 주의점
   6) 다음 수업에서 해볼 수 있는 작은 지원
4. 응답 마지막에 "※ AI 상담 전략은 참고용입니다. 최종 판단과 실제 상담은 교사가 학생의 상황을 종합적으로 고려하여 진행해야 합니다."를 포함하세요.
  `;

  const prompt = `
다음 학생 데이터와 교사의 고민을 바탕으로 상담 전략을 제안해 주세요.

- 학생(익명): ${studentAlias}
- 성적 요약: ${gradeSummary}
- 학습 특성 요약: ${learningTraits}
- 교사 고민: ${teacherConcern}
  `;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: [{
            parts: [{ text: prompt }]
          }]
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", errorData);
      return res.status(500).json({ success: false, error: "Gemini API 호출 중 오류가 발생했습니다." });
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "결과를 생성할 수 없습니다.";

    return res.status(200).json({ success: true, result: resultText });
  } catch (error) {
    console.error("Serverless Function Error:", error);
    return res.status(500).json({ success: false, error: "서버 내부 오류가 발생했습니다." });
  }
}
