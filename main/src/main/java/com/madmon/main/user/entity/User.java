package com.madmon.main.user.entity;

import com.madmon.main.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Check;

@Getter
@Entity
@Table(
        name = "users",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_users_user_id", columnNames = "user_id")
        }
)
@Check(constraints = "initial_attack BETWEEN 1 AND 10 AND initial_defense BETWEEN 1 AND 10 "
        + "AND initial_agility BETWEEN 1 AND 10 AND initial_teamwork BETWEEN 1 AND 10 "
        + "AND initial_mana BETWEEN 1 AND 10 AND initial_health BETWEEN 1 AND 10")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, length = 50)
    private String userId;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "profile_image_url", columnDefinition = "TEXT")
    private String profileImageUrl;

    @Column(length = 50)
    private String biography;

    @Column(name = "initial_attack")
    private Integer initialAttack;

    @Column(name = "initial_defense")
    private Integer initialDefense;

    @Column(name = "initial_agility")
    private Integer initialAgility;

    @Column(name = "initial_teamwork")
    private Integer initialTeamwork;

    @Column(name = "initial_mana")
    private Integer initialMana;

    @Column(name = "initial_health")
    private Integer initialHealth;

    @Column(name = "password_changed", nullable = false)
    private boolean passwordChanged;

    private User(
            String userId,
            String passwordHash,
            String name,
            String profileImageUrl,
            String biography,
            Integer initialAttack,
            Integer initialDefense,
            Integer initialAgility,
            Integer initialTeamwork,
            Integer initialMana,
            Integer initialHealth,
            boolean passwordChanged
    ) {
        this.userId = userId;
        this.passwordHash = passwordHash;
        this.name = name;
        this.profileImageUrl = profileImageUrl;
        this.biography = biography;
        this.initialAttack = initialAttack;
        this.initialDefense = initialDefense;
        this.initialAgility = initialAgility;
        this.initialTeamwork = initialTeamwork;
        this.initialMana = initialMana;
        this.initialHealth = initialHealth;
        this.passwordChanged = passwordChanged;
    }

    public static User create(
            String userId,
            String passwordHash,
            String name,
            String profileImageUrl,
            String biography,
            Integer initialAttack,
            Integer initialDefense,
            Integer initialAgility,
            Integer initialTeamwork,
            Integer initialMana,
            Integer initialHealth,
            boolean passwordChanged
    ) {
        return new User(
                userId,
                passwordHash,
                name,
                profileImageUrl,
                biography,
                initialAttack,
                initialDefense,
                initialAgility,
                initialTeamwork,
                initialMana,
                initialHealth,
                passwordChanged
        );
    }

    public void updateProfile(String profileImageUrl, String biography) {
        this.profileImageUrl = profileImageUrl;
        this.biography = biography;
    }

    public void updateProfileImage(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }

    public void updateInitialStats(
            Integer initialAttack,
            Integer initialDefense,
            Integer initialAgility,
            Integer initialTeamwork,
            Integer initialMana,
            Integer initialHealth
    ) {
        this.initialAttack = initialAttack;
        this.initialDefense = initialDefense;
        this.initialAgility = initialAgility;
        this.initialTeamwork = initialTeamwork;
        this.initialMana = initialMana;
        this.initialHealth = initialHealth;
    }

    public void changePassword(String passwordHash) {
        this.passwordHash = passwordHash;
        this.passwordChanged = true;
    }
}
