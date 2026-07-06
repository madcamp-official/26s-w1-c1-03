package com.madmon.main.chat.client;

// OpenAI Chat Completions API가 기대하는 role 값("system"/"user"/"assistant")을 그대로 담는다.
// 우리 DB의 ChatMessageRole(USER/ASSISTANT/SYSTEM, 대문자)과는 별개의 wire 모델이다.
public record OpenAiMessage(String role, String content) {

    public static OpenAiMessage system(String content) {
        return new OpenAiMessage("system", content);
    }

    public static OpenAiMessage user(String content) {
        return new OpenAiMessage("user", content);
    }

    public static OpenAiMessage assistant(String content) {
        return new OpenAiMessage("assistant", content);
    }
}
