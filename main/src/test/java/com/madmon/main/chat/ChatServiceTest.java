package com.madmon.main.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.madmon.main.chat.client.OpenAiClient;
import com.madmon.main.chat.client.OpenAiMessage;
import com.madmon.main.chat.dto.ChatSessionDetailResponse;
import com.madmon.main.chat.dto.ChatSessionResponse;
import com.madmon.main.chat.dto.CreateSessionRequest;
import com.madmon.main.chat.dto.ChatMessageResponse;
import com.madmon.main.chat.dto.SendMessageRequest;
import com.madmon.main.chat.entity.ChatMessageRole;
import com.madmon.main.chat.service.ChatService;
import com.madmon.main.common.exception.BusinessException;
import com.madmon.main.common.exception.ErrorCode;
import com.madmon.main.team.entity.Team;
import com.madmon.main.team.entity.TeamMember;
import com.madmon.main.team.repository.TeamMemberRepository;
import com.madmon.main.team.repository.TeamRepository;
import com.madmon.main.user.entity.User;
import com.madmon.main.user.entity.UserStats;
import com.madmon.main.user.repository.UserRepository;
import com.madmon.main.user.repository.UserStatsRepository;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "spring.profiles.active=test")
@Transactional
class ChatServiceTest {

    private static final long DEADLINE_BUFFER_MS = 300;

    @Autowired
    private ChatService chatService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserStatsRepository userStatsRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private TeamMemberRepository teamMemberRepository;

    // 실제 OpenAI 호출은 네트워크가 필요하므로 여기서는 항상 mock으로 대체한다.
    @MockitoBean
    private OpenAiClient openAiClient;

    @Test
    void 잠긴_사용자는_세션을_생성할_수_없다() throws InterruptedException {
        User locked = createOnboardedUser("chat-locked1", "잠긴사용자1");
        User teammate = createOnboardedUser("chat-teammate1", "팀원1");
        makeLocked(locked, teammate);

        User target = createOnboardedUser("chat-target1", "타겟1");

        BusinessException exception = assertThrows(BusinessException.class,
                () -> chatService.createSession(locked.getId(), new CreateSessionRequest(List.of(target.getId()), null)));

        assertEquals(ErrorCode.CHAT_LOCKED, exception.getErrorCode());
    }

    @Test
    void 카드_1개로_세션을_생성하면_기본_제목이_붙는다() {
        User asker = createOnboardedUser("chat-asker1", "질문자1");
        User target = createOnboardedUser("chat-target2", "타겟2");

        ChatSessionResponse session = chatService.createSession(asker.getId(), new CreateSessionRequest(List.of(target.getId()), null));

        assertEquals("타겟2와의 대화", session.title());
        assertEquals(1, session.targets().size());
        assertEquals(target.getId(), session.targets().get(0).userId());
    }

    @Test
    void 카드_여러개로_세션을_생성하면_전체_카드가_연결된다() {
        User asker = createOnboardedUser("chat-asker2", "질문자2");
        User target1 = createOnboardedUser("chat-target3", "타겟3");
        User target2 = createOnboardedUser("chat-target4", "타겟4");

        ChatSessionResponse session = chatService.createSession(
                asker.getId(), new CreateSessionRequest(List.of(target1.getId(), target2.getId()), "우리 팀 분석")
        );

        assertEquals("우리 팀 분석", session.title());
        assertEquals(2, session.targets().size());
    }

    @Test
    void 세션에_메시지를_보내면_AI_응답이_저장된다() {
        User asker = createOnboardedUser("chat-asker3", "질문자3");
        User target = createOnboardedUser("chat-target5", "타겟5");
        when(openAiClient.createChatCompletion(anyList())).thenReturn("테스트 AI 응답");

        ChatSessionResponse session = chatService.createSession(asker.getId(), new CreateSessionRequest(List.of(target.getId()), null));
        ChatMessageResponse response = chatService.sendMessage(asker.getId(), session.id(), new SendMessageRequest("이 사람 어때?"));

        assertEquals(ChatMessageRole.ASSISTANT, response.role());
        assertEquals("테스트 AI 응답", response.content());

        ChatSessionDetailResponse detail = chatService.getSessionDetail(asker.getId(), session.id());
        assertEquals(2, detail.messages().size());
        assertEquals(ChatMessageRole.USER, detail.messages().get(0).role());
        assertEquals("이 사람 어때?", detail.messages().get(0).content());
    }

    @Test
    void 이전_대화_맥락이_다음_요청에도_포함된다() {
        User asker = createOnboardedUser("chat-asker4", "질문자4");
        User target = createOnboardedUser("chat-target6", "타겟6");
        when(openAiClient.createChatCompletion(anyList())).thenReturn("첫 응답", "두번째 응답");

        ChatSessionResponse session = chatService.createSession(asker.getId(), new CreateSessionRequest(List.of(target.getId()), null));
        chatService.sendMessage(asker.getId(), session.id(), new SendMessageRequest("첫 질문입니다"));
        chatService.sendMessage(asker.getId(), session.id(), new SendMessageRequest("두번째 질문입니다"));

        ArgumentCaptor<List<OpenAiMessage>> captor = ArgumentCaptor.forClass(List.class);
        verify(openAiClient, org.mockito.Mockito.times(2)).createChatCompletion(captor.capture());

        List<OpenAiMessage> secondCallMessages = captor.getAllValues().get(1);
        // system + (첫 질문 user) + (첫 응답 assistant) + (두번째 질문 user) = 4개가 되어야 이전 맥락이 이어진 것이다.
        assertEquals(4, secondCallMessages.size());
        assertEquals("system", secondCallMessages.get(0).role());
        assertEquals("첫 질문입니다", secondCallMessages.get(1).content());
        assertEquals("첫 응답", secondCallMessages.get(2).content());
        assertEquals("두번째 질문입니다", secondCallMessages.get(3).content());
    }

    @Test
    void 잠긴_사용자는_메시지를_보낼_수_없다() throws InterruptedException {
        User asker = createOnboardedUser("chat-asker5", "질문자5");
        User target = createOnboardedUser("chat-target7", "타겟7");
        ChatSessionResponse session = chatService.createSession(asker.getId(), new CreateSessionRequest(List.of(target.getId()), null));

        User teammate = createOnboardedUser("chat-teammate5", "팀원5");
        makeLocked(asker, teammate);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> chatService.sendMessage(asker.getId(), session.id(), new SendMessageRequest("질문")));

        assertEquals(ErrorCode.CHAT_LOCKED, exception.getErrorCode());
    }

    @Test
    void 세션_소유자가_아니면_조회할_수_없다() {
        User owner = createOnboardedUser("chat-owner1", "주인1");
        User stranger = createOnboardedUser("chat-stranger1", "타인1");
        User target = createOnboardedUser("chat-target8", "타겟8");

        ChatSessionResponse session = chatService.createSession(owner.getId(), new CreateSessionRequest(List.of(target.getId()), null));

        BusinessException exception = assertThrows(BusinessException.class,
                () -> chatService.getSessionDetail(stranger.getId(), session.id()));

        assertEquals(ErrorCode.RESOURCE_NOT_FOUND, exception.getErrorCode());
    }

    @Test
    void 내_세션_목록을_최신순으로_조회할_수_있다() {
        User asker = createOnboardedUser("chat-asker6", "질문자6");
        User target = createOnboardedUser("chat-target9", "타겟9");

        chatService.createSession(asker.getId(), new CreateSessionRequest(List.of(target.getId()), "첫 세션"));
        chatService.createSession(asker.getId(), new CreateSessionRequest(List.of(target.getId()), "둘째 세션"));

        List<ChatSessionResponse> sessions = chatService.getSessions(asker.getId());

        assertEquals(2, sessions.size());
        assertTrue(sessions.get(0).createdAt().compareTo(sessions.get(1).createdAt()) >= 0);
    }

    private void makeLocked(User viewer, User teammate) throws InterruptedException {
        Team team = teamRepository.save(Team.create("잠금팀", "CHATLK", viewer, Instant.now().plusMillis(DEADLINE_BUFFER_MS)));
        teamMemberRepository.save(TeamMember.join(team, viewer));
        teamMemberRepository.save(TeamMember.join(team, teammate));
        Thread.sleep(DEADLINE_BUFFER_MS + 200);
    }

    private User createOnboardedUser(String userId, String name) {
        User user = userRepository.save(User.create(
                userId, "hash", name, null, "자기소개-" + userId, 5, 5, 5, 5, 5, 5, true
        ));
        userStatsRepository.save(UserStats.createFrom(user));
        return user;
    }
}
