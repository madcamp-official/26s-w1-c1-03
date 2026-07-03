package com.madmon.main.title;

import com.madmon.main.title.entity.Title;
import com.madmon.main.title.repository.TitleRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("!test")
@RequiredArgsConstructor
public class TitleDataInitializer implements CommandLineRunner {

    private final TitleRepository titleRepository;

    @Override
    public void run(String... args) {
        if (titleRepository.count() > 0) {
            return;
        }

        titleRepository.saveAll(defaultTitles());
    }

    private List<Title> defaultTitles() {
        return List.of(
                Title.create("프론트엔드 장인", "화면과 사용자 경험을 세련되게 만드는 사람", "frontend-master"),
                Title.create("팀 플레이어", "협업과 배려로 팀 분위기를 살리는 사람", "team-player"),
                Title.create("문제 해결사", "복잡한 문제를 끝까지 파고드는 사람", "problem-solver"),
                Title.create("소통왕", "의견을 잘 정리하고 전달하는 사람", "communicator"),
                Title.create("아이디어 뱅크", "새로운 발상과 방향을 제시하는 사람", "idea-bank"),
                Title.create("실행력 괴물", "생각을 빠르게 결과로 옮기는 사람", "execution-machine")
        );
    }
}
