package com.madmon.main.chat.client;

import java.util.List;

// OpenAI Chat Completions 호출을 추상화한다(BACKEND_DEVELOPMENT_PLAN.md §8.1).
// 필요 시 공식 SDK나 다른 구현으로 교체할 수 있도록 인터페이스로 분리했다.
public interface OpenAiClient {

    String createChatCompletion(List<OpenAiMessage> messages);
}
