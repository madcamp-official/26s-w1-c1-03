package com.madmon.main.chat.service;

import com.madmon.main.star.dto.StarDetailResponse;
import com.madmon.main.star.service.StarService;
import com.madmon.main.chat.client.OpenAiClient;
import com.madmon.main.chat.client.OpenAiMessage;
import com.madmon.main.chat.dto.ChatStarBrief;
import com.madmon.main.chat.dto.ChatMessageResponse;
import com.madmon.main.chat.dto.ChatSessionDetailResponse;
import com.madmon.main.chat.dto.ChatSessionResponse;
import com.madmon.main.chat.dto.CreateSessionRequest;
import com.madmon.main.chat.dto.SendMessageRequest;
import com.madmon.main.chat.entity.ChatStar;
import com.madmon.main.chat.entity.ChatMessage;
import com.madmon.main.chat.entity.ChatMessageRole;
import com.madmon.main.chat.entity.ChatSession;
import com.madmon.main.chat.repository.ChatStarRepository;
import com.madmon.main.chat.repository.ChatMessageRepository;
import com.madmon.main.chat.repository.ChatSessionRepository;
import com.madmon.main.common.exception.BusinessException;
import com.madmon.main.common.exception.ErrorCode;
import com.madmon.main.user.entity.User;
import com.madmon.main.user.repository.UserRepository;
import com.madmon.main.user.repository.UserStatsRepository;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// AI 별 분석(§8). Star 도메인이 제공하는 요약 데이터(능력치, 대표 칭호, 자기소개)를
// 그대로 프롬프트 컨텍스트로 사용하므로 star 패키지 완성 이후에 구현한다(Phase 9 선행).
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatService {

    private static final int MAX_TITLE_LENGTH = 100;

    private final ChatSessionRepository chatSessionRepository;
    private final ChatStarRepository chatStarRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final UserStatsRepository userStatsRepository;
    private final StarService starService;
    private final OpenAiClient openAiClient;

    @Transactional
    public ChatSessionResponse createSession(Long userId, CreateSessionRequest request) {
        requireUnlocked(userId);

        List<Long> targetIds = request.targetUserIds().stream().distinct().toList();
        List<User> targets = targetIds.stream().map(this::getOnboardedUser).toList();

        User asker = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        String title = (request.title() == null || request.title().isBlank())
                ? defaultTitle(targets)
                : request.title();

        ChatSession session = chatSessionRepository.save(ChatSession.create(asker, title));
        for (User target : targets) {
            chatStarRepository.save(ChatStar.create(session, target));
        }

        return toSessionResponse(session, targets);
    }

    public List<ChatSessionResponse> getSessions(Long userId) {
        requireUnlocked(userId);
        return chatSessionRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(session -> toSessionResponse(session, targetsOf(session)))
                .toList();
    }

    public ChatSessionDetailResponse getSessionDetail(Long userId, Long sessionId) {
        requireUnlocked(userId);
        ChatSession session = getOwnedSession(userId, sessionId);
        List<User> targets = targetsOf(session);
        List<ChatMessageResponse> messages = chatMessageRepository.findAllBySessionIdOrderByCreatedAtAsc(sessionId).stream()
                .map(this::toMessageResponse)
                .toList();

        return new ChatSessionDetailResponse(
                session.getId(), session.getSessionTitle(),
                targets.stream().map(this::toStarBrief).toList(),
                messages, session.getCreatedAt()
        );
    }

    // 프론트엔드는 사용자 메시지를 API 호출 전에 이미 화면에 반영해두므로,
    // 응답에는 AI(assistant) 메시지 하나만 담아 돌려준다.
    @Transactional
    public ChatMessageResponse sendMessage(Long userId, Long sessionId, SendMessageRequest request) {
        requireUnlocked(userId);
        ChatSession session = getOwnedSession(userId, sessionId);

        chatMessageRepository.save(ChatMessage.create(session, ChatMessageRole.USER, request.content()));

        List<OpenAiMessage> prompt = buildPrompt(userId, session);
        String assistantReply = openAiClient.createChatCompletion(prompt);

        ChatMessage assistantMessage = chatMessageRepository.save(
                ChatMessage.create(session, ChatMessageRole.ASSISTANT, assistantReply)
        );

        return toMessageResponse(assistantMessage);
    }

    private List<OpenAiMessage> buildPrompt(Long viewerId, ChatSession session) {
        List<User> targets = targetsOf(session);
        String systemPrompt = targets.size() == 1
                ? buildIndividualSystemPrompt(viewerId, targets.get(0))
                : buildGroupSystemPrompt(viewerId, targets);

        List<OpenAiMessage> messages = new ArrayList<>();
        messages.add(OpenAiMessage.system(systemPrompt));
        chatMessageRepository.findAllBySessionIdOrderByCreatedAtAsc(session.getId()).forEach(message ->
                messages.add(message.getRole() == ChatMessageRole.ASSISTANT
                        ? OpenAiMessage.assistant(message.getContent())
                        : OpenAiMessage.user(message.getContent()))
        );
        return messages;
    }

    private String buildIndividualSystemPrompt(Long viewerId, User target) {
        return """
                당신은 몰입캠프 참가자 별(은하) 관측소의 AI 분석 도우미입니다.
                아래는 개별 별 질문의 분석 대상 참가자 정보입니다.
                %s
                이 정보를 바탕으로 사용자의 질문에 한국어로 답하세요. 정보에 없는 내용은 추측하지 말고 모른다고 답하세요.
                """.formatted(describeStar(starService.getStarDetail(viewerId, target.getId())));
    }

    private String buildGroupSystemPrompt(Long viewerId, List<User> targets) {
        String starsDescription = targets.stream()
                .map(target -> describeStar(starService.getStarDetail(viewerId, target.getId())))
                .collect(Collectors.joining("\n---\n"));

        return """
                당신은 몰입캠프 참가자 별(은하) 관측소의 AI 분석 도우미입니다.
                아래는 비교 분석 또는 팀 조합 분석 대상 참가자 %d명의 정보입니다.
                %s
                이 정보를 바탕으로 참가자들의 강점/약점 비교 또는 팀 시너지에 대한 사용자의 질문에 한국어로 답하세요.
                정보에 없는 내용은 추측하지 말고 모른다고 답하세요.
                """.formatted(targets.size(), starsDescription);
    }

    private String describeStar(StarDetailResponse star) {
        StringBuilder description = new StringBuilder();
        description.append("- 이름: ").append(star.name()).append('\n');

        if (star.representativeTitles() != null && !star.representativeTitles().isEmpty()) {
            description.append("  대표 칭호: ").append(String.join(", ", star.representativeTitles())).append('\n');
        }
        if (star.stats() != null) {
            description.append("  능력치 - 체력:%s 공격력:%s 방어력:%s 마력:%s 민첩성:%s 협동력:%s%n".formatted(
                    star.stats().health(), star.stats().attack(), star.stats().defense(),
                    star.stats().mana(), star.stats().agility(), star.stats().teamwork()
            ));
        }
        if (star.biography() != null && !star.biography().isBlank()) {
            description.append("  자기소개: ").append(star.biography()).append('\n');
        }
        return description.toString();
    }

    // Chat 기능 전체가 별 상세 잠금 여부에 연동된다(기능명세서 4.6.4).
    // 은하(별) 관측의 판정 로직(Phase 9)을 그대로 재사용한다.
    private void requireUnlocked(Long viewerId) {
        if (!starService.evaluateLockStatus(viewerId).unlocked()) {
            throw new BusinessException(ErrorCode.CHAT_LOCKED);
        }
    }

    private User getOnboardedUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        if (!userStatsRepository.existsById(userId)) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
        }
        return user;
    }

    private ChatSession getOwnedSession(Long userId, Long sessionId) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        if (!session.getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
        }
        return session;
    }

    private List<User> targetsOf(ChatSession session) {
        return chatStarRepository.findAllBySessionId(session.getId()).stream()
                .map(ChatStar::getTargetUser)
                .toList();
    }

    private String defaultTitle(List<User> targets) {
        LinkedHashSet<String> names = targets.stream().map(User::getName).collect(Collectors.toCollection(LinkedHashSet::new));
        String base = names.stream().limit(2).collect(Collectors.joining(", "));
        int extra = names.size() - 2;
        String title = extra > 0 ? "%s 외 %d명과의 대화".formatted(base, extra) : "%s와의 대화".formatted(base);
        return title.length() > MAX_TITLE_LENGTH ? title.substring(0, MAX_TITLE_LENGTH) : title;
    }

    private ChatSessionResponse toSessionResponse(ChatSession session, List<User> targets) {
        return new ChatSessionResponse(
                session.getId(), session.getSessionTitle(),
                targets.stream().map(this::toStarBrief).toList(),
                session.getCreatedAt()
        );
    }

    private ChatStarBrief toStarBrief(User user) {
        return new ChatStarBrief(user.getId(), user.getName(), user.getProfileImageUrl());
    }

    private ChatMessageResponse toMessageResponse(ChatMessage message) {
        return new ChatMessageResponse(message.getId(), message.getRole(), message.getContent(), message.getCreatedAt());
    }
}
