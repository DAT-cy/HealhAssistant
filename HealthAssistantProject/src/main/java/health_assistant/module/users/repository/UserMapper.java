package health_assistant.module.users.repository;

import health_assistant.module.users.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface UserMapper {
    Optional<User> findByUsername(String username);
    Optional<User> findByUserId(Long userId);
    int countAdminUsers();
    long countUsers(@Param("role") String role, @Param("enabled") Boolean enabled);
    List<User> findAdminUsers(@Param("query") String query, @Param("role") String role, @Param("enabled") Boolean enabled);
    int updateEnabled(@Param("userId") Long userId, @Param("enabled") boolean enabled);
    int updateRole(@Param("userId") Long userId, @Param("role") String role);
    void insertUser(User user);
    int updatePasswordByUsername(@org.apache.ibatis.annotations.Param("username") String username,
                                 @org.apache.ibatis.annotations.Param("password") String password);
}
