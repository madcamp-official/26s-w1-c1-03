package com.madmon.main.chat.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.madmon.main.common.exception.BusinessException;
import com.madmon.main.common.exception.ErrorCode;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class OpenAiChatClient implements OpenAiClient {

    private final RestClient restClient;
    private final String model;

    public OpenAiChatClient(
            @Qualifier("openAiRestClient") RestClient restClient,
            @Value("${app.openai.model}") String model
    ) {
        this.restClient = restClient;
        this.model = model;
    }

    @Override
    public String createChatCompletion(List<OpenAiMessage> messages) {
        try {
            ChatCompletionResponse response = restClient.post()
                    .uri("/chat/completions")
                    .body(new ChatCompletionRequest(model, messages))
                    .retrieve()
                    .body(ChatCompletionResponse.class);

            if (response == null || response.choices() == null || response.choices().isEmpty()) {
                throw new BusinessException(ErrorCode.OPENAI_REQUEST_FAILED);
            }

            return response.choices().get(0).message().content();
        } catch (RestClientException e) {
            throw new BusinessException(ErrorCode.OPENAI_REQUEST_FAILED);
        }
    }

    private record ChatCompletionRequest(String model, List<OpenAiMessage> messages) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ChatCompletionResponse(List<Choice> choices) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Choice(OpenAiMessage message) {
    }
}
