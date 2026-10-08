package health_assistant.config.app;

import health_assistant.config.response.CommonException;
import health_assistant.config.response.ErrorCode;
import health_assistant.module.users.service.impl.UserDetailServiceImpl;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserDetailServiceImpl userService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        try{
            final String authHeader = request.getHeader("Authorization");
            final String jwt;
            final String username;

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                filterChain.doFilter(request, response);
                return;
            }

            jwt = authHeader.substring(7);
            username = jwtService.extractUsername(jwt);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userService.loadUserByUsername(username);

                if (jwtService.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request)
                    );
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
            filterChain.doFilter(request, response);
        }
        catch (ExpiredJwtException e) {
            response.sendError(ErrorCode.JWT_EXPIRED.getStatus(), ErrorCode.JWT_EXPIRED.getMessage());
        }
        catch (SecurityException e){
            response.sendError(ErrorCode.JWT_INVALID.getStatus(), ErrorCode.JWT_INVALID.getMessage());
        }
        catch (MalformedJwtException e){
            response.sendError(ErrorCode.JWT_MALFORMED.getStatus(), ErrorCode.JWT_MALFORMED.getMessage());
        }
        catch (UnsupportedJwtException e){
            response.sendError(ErrorCode.JWT_UNSUPPORTED.getStatus(), ErrorCode.JWT_UNSUPPORTED.getMessage());
        }
        catch (CommonException e) {
            response.sendError(ErrorCode.INTER_SERVER_ERROR.getStatus(), ErrorCode.INTER_SERVER_ERROR.getMessage());
        }

    }
} 