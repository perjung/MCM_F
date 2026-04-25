import dotenv from 'dotenv';
dotenv.config();

async function checkAvailableModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("🔍 구글 서버에 내 API 키로 쓸 수 있는 모델 목록을 요청합니다...");
  
  try {
    // SDK를 거치지 않고 구글 API 서버에 직접 다이렉트로 요청!
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    if (data.models) {
      console.log("\n✅ [사용 가능한 Gemini 모델 목록]");
      // 목록이 너무 많을 수 있으니 'gemini'라는 단어가 포함된 것만 골라서 출력
      data.models
        .filter(m => m.name.includes('gemini'))
        .forEach(m => console.log(m.name));
    } else {
      console.log("\n❌ 권한 오류 또는 에러 발생:", data);
    }
  } catch (error) {
    console.error("통신 에러 발생:", error);
  }
}

checkAvailableModels();