// 2. 메인 AI 스토리 생성 라우트
app.post('/api/story', async (req, res) => {
  const { time, myAction } = req.body;

  // 행동 예외 처리 (계획이 시원하게 망한 상황으로 설정)
  const userActionDescription = myAction 
    ? `내가 "${myAction}"(을)를 야심 차게 계획했는데, 완벽하게 망해버린 상황.` 
    : `이 시간대에 내가 할 법한 흔한 계획을 네가 상상하고, 그게 아주 어이없게 실패한 상황.`;

  // AI에게 내릴 프롬프트
  const prompt = `
    너는 지금부터 B급 코미디 시트콤 작가야. 
    아래 정보를 바탕으로 주인공(나)의 계획이 실패했을 때 벌어지는 우당탕탕 스토리를 써줘.

    [배경 정보]
    - 현재 시간대: ${time}
    - 상황: ${userActionDescription}
    
    주인공의 계획이 꼬여버린 이 환장할 현장에, 최소 1명에서 최대 4명의 엉뚱한 조연(엑스트라)들이 얽히면서 상황이 더 골때리게(하지만 웃기게) 흘러가는 '대환장 미래'를 만들어줘.
    
    결과는 반드시 아래의 JSON 형식으로만 응답해:
    {
      "extras": [
        {
          "name": "조연의 구체적이고 특이한 정체 (예: 3년 차 비둘기, 팩폭 날리는 초등학생, 길 잃은 배달원)",
          "action": "주인공의 망한 계획에 냅다 불을 지피거나 엉뚱하게 얽히는 시선 강탈 행동"
        }
      ],
      "fullStory": "주인공의 계획이 어떻게 망했으며 조연들이 어떻게 얽혔는지, 이 우당탕탕 상황을 찰진 입담으로 요약한 시트콤 나레이션 같은 한 문장"
    }
    
    ※ 주의: extras 배열 안의 조연 데이터는 상황에 맞게 1개~4개 사이로 유동적으로 생성할 것.
  `;

  try {
    // 구글 Gemini에게 생성 요청
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("RAW TEXT:", text);

    let storyData;

    try {
      const cleanText = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      // AI가 준 글자를 자바스크립트가 읽을 수 있는 진짜 JSON으로 변환
      storyData = JSON.parse(cleanText);
    } catch (e) {
      console.error("❌ JSON 파싱 실패:", text);
      throw e;
    }
    
    // 성공했을 때 돌려줄 결과
    res.status(200).json({
      message: "AI 스토리 생성 완료!",
      data: {
        time: time,
        ...storyData // 여기에 extras 배열과 fullStory가 포함되어 나감
      }
    });

  } catch (error) {
    console.error("AI 생성 중 에러 발생:", error);
    res.status(500).json({ error: "스토리 생성 중 문제가 발생했습니다." });
  }
});