package com.madmon.main.user.entity;

import com.madmon.main.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "users")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "profile_image", length = 500)
    private String profileImage;

    @Column(length = 50)
    private String biography;

    @Column(name = "initial_attack", nullable = false)
    private int initialAttack;

    @Column(name = "initial_defense", nullable = false)
    private int initialDefense;

    @Column(name = "initial_speed", nullable = false)
    private int initialSpeed;

    @Column(name = "initial_teamwork", nullable = false)
    private int initialTeamwork;

    @Column(name = "initial_creativity", nullable = false)
    private int initialCreativity;

    @Column(name = "initial_problem_solving", nullable = false)
    private int initialProblemSolving;

    @Column(name = "password_changed", nullable = false)
    private boolean passwordChanged;

    private User(
            String passwordHash,
            String name,
            String profileImage,
            String biography,
            int initialAttack,
            int initialDefense,
            int initialSpeed,
            int initialTeamwork,
            int initialCreativity,
            int initialProblemSolving,
            boolean passwordChanged
    ) {
        this.passwordHash = passwordHash;
        this.name = name;
        this.profileImage = profileImage;
        this.biography = biography;
        this.initialAttack = initialAttack;
        this.initialDefense = initialDefense;
        this.initialSpeed = initialSpeed;
        this.initialTeamwork = initialTeamwork;
        this.initialCreativity = initialCreativity;
        this.initialProblemSolving = initialProblemSolving;
        this.passwordChanged = passwordChanged;
    }

    public static User create(
            String passwordHash,
            String name,
            String profileImage,
            String biography,
            int initialAttack,
            int initialDefense,
            int initialSpeed,
            int initialTeamwork,
            int initialCreativity,
            int initialProblemSolving,
            boolean passwordChanged
    ) {
        return new User(
                passwordHash,
                name,
                profileImage,
                biography,
                initialAttack,
                initialDefense,
                initialSpeed,
                initialTeamwork,
                initialCreativity,
                initialProblemSolving,
                passwordChanged
        );
    }

    public void updateProfile(String profileImage, String biography) {
        this.profileImage = profileImage;
        this.biography = biography;
    }

    public void updateInitialStats(
            int initialAttack,
            int initialDefense,
            int initialSpeed,
            int initialTeamwork,
            int initialCreativity,
            int initialProblemSolving
    ) {
        this.initialAttack = initialAttack;
        this.initialDefense = initialDefense;
        this.initialSpeed = initialSpeed;
        this.initialTeamwork = initialTeamwork;
        this.initialCreativity = initialCreativity;
        this.initialProblemSolving = initialProblemSolving;
    }

    public void changePassword(String passwordHash) {
        this.passwordHash = passwordHash;
        this.passwordChanged = true;
    }
}
