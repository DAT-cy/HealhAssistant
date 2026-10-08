package health_assistant.utils;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ClientUtils {
    ///Version
    public static final String VERSION = "/api/v1";

    ///Local env
    private static final String LOCAL_SERVER_URL = "http://localhost:11234/";
    private static final String LOCAL_USER_URL = "http://localhost:5173/";
    private static final String LOCAL_ADMIN_URL = "http://localhost:5173/";

    ///Develop env
    private static final String DEV_SERVER_URL = "";
    private static final String DEV_USER_URL = "";
    private static final String DEV_ADMIN_URL = "";

    ///Product env
    private static final String PROD_SERVER_URL = "";
    private static final String PROD_USER_URL = "";
    private static final String PROD_ADMIN_URL = "";

    ///Profile name
    public static final String LOCAL_PROFILE_NM = "local";
    public static final String DEV_PROFILE_NM = "dev";
    public static final String PROD_PROFILE_NM = "prod";
    ///google
    public static final String GOOGLE = "GOOGLE";
    public static final String FACEBOOK = "FACEBOOK";


    @Value("${spring.profiles.active:prod}")
    private String profile;

    public String getProfile() {
        return profile;
    }

    public String getClientUserUrl() {
        if (profile.equals(LOCAL_PROFILE_NM)) {
            return LOCAL_USER_URL;
        } else if (profile.equals(DEV_PROFILE_NM)) {
            return DEV_USER_URL;
        } else {
            return PROD_USER_URL;
        }
    }

    public String getClientAdminUrl() {
        if (profile.equals(LOCAL_PROFILE_NM)) {
            return LOCAL_ADMIN_URL;
        } else if (profile.equals(DEV_PROFILE_NM)) {
            return DEV_ADMIN_URL;
        } else {
            return PROD_ADMIN_URL;
        }
    }

    public String getServerUrl() {
        if (profile.equals(LOCAL_PROFILE_NM)) {
            return LOCAL_SERVER_URL;
        } else if (profile.equals(DEV_PROFILE_NM)) {
            return DEV_SERVER_URL;
        } else {
            return PROD_SERVER_URL;
        }
    }

}
